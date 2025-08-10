// main.js — core functions for UI, pages, modals, and in-memory admin functions.
// Uses ES6 modules (imports data.js which exports sample arrays)
import { shipments as initialShipments, flights as initialFlights } from './data.js';

// We'll keep internal state that can be mutated (simulating admin functions).
let shipments = JSON.parse(JSON.stringify(initialShipments));
let flights = JSON.parse(JSON.stringify(initialFlights));
const activity = [];

// Persist to localStorage so reloads keep edits
const STORAGE_KEY = 'hmavi_data_v1';
function persist() {
  const payload = { shipments, flights, activity };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
function loadPersist() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.shipments) shipments = parsed.shipments;
    if (parsed.flights) flights = parsed.flights;
    if (parsed.activity) activity.splice(0, activity.length, ...parsed.activity);
  } catch (e) {
    console.warn('Failed to parse persisted data', e);
  }
}
loadPersist();

/* -------------------------
   Helpers
   ------------------------- */
function el(selector, root = document) {
  return root.querySelector(selector);
}
function elAll(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}
function formatDateISO(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
}
function pushActivity(text) {
  activity.unshift({ time: new Date().toISOString(), text });
  // keep length reasonable
  if (activity.length > 200) activity.pop();
  persist();
}

/* -------------------------
   Nav toggle (mobile)
   ------------------------- */
function setupNavToggle() {
  const btn = el('#navToggle');
  const nav = el('.nav-list');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const isHidden = getComputedStyle(nav).display === 'none';
    nav.style.display = isHidden ? 'flex' : 'none';
  });
}
setupNavToggle();

/* -------------------------
   Dashboard page logic
   ------------------------- */
function initDashboard() {
  if (!document.body.classList.contains('page-dashboard')) return;

  const totalShipmentsEl = el('#totalShipments');
  const activeFlightsEl = el('#activeFlights');
  const pendingPackagesEl = el('#pendingPackages');
  const deliveredPackagesEl = el('#deliveredPackages');
  const activityList = el('#activityList');
  const clearFeedBtn = el('#clearFeed');

  function renderStats() {
    totalShipmentsEl.textContent = shipments.length;
    activeFlightsEl.textContent = flights.filter(f => f.status === 'Active').length;
    pendingPackagesEl.textContent = shipments.filter(s => s.status === 'Pending').length;
    deliveredPackagesEl.textContent = shipments.filter(s => s.status === 'Delivered').length;
  }

  function renderActivity() {
    activityList.innerHTML = '';
    if (activity.length === 0) {
      activityList.innerHTML = '<li style="color:var(--muted)">No recent activity</li>';
      return;
    }
    activity.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<div style="font-weight:600;color:var(--white)">${item.text}</div><div style="font-size:12px;color:var(--muted)">${formatDateISO(item.time)}</div>`;
      activityList.appendChild(li);
    });
  }

  if (clearFeedBtn) clearFeedBtn.addEventListener('click', () => {
    activity.splice(0, activity.length);
    persist();
    renderActivity();
  });

  // Chart.js shipments chart
  const ctx = el('#shipmentsChart');
  let shipmentsChart = null;
  function renderChart() {
    if (!ctx) return;
    // simple last-7-days simulated data from shipments history
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString());
    }
    const counts = labels.map(label => {
      // count shipments created on that date (rough compare)
      return shipments.filter(s => {
        const create = s.history?.[0]?.time;
        if (!create) return 0;
        const date = new Date(create).toLocaleDateString();
        return date === label;
      }).length;
    });

    if (shipmentsChart) shipmentsChart.destroy();
    shipmentsChart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Shipments Created',
          data: counts,
          backgroundColor: 'rgba(255, 76, 76, 0.9)',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#fff' } },
          x: { ticks: { color: '#fff' } }
        }
      }
    });
  }

  renderStats();
  renderActivity();
  renderChart();

  // Update periodically (demo)
  setInterval(() => {
    renderStats();
    renderActivity();
    renderChart();
  }, 4000);
}

/* -------------------------
   Shipments page logic
   ------------------------- */
function initShipments() {
  if (!document.body.classList.contains('page-shipments')) return;

  const tableBody = el('#shipmentsTableBody');
  const searchInput = el('#shipmentSearch');
  const searchBtn = el('#searchBtn');
  const statusFilter = el('#statusFilter');

  const shipmentModal = el('#shipmentModal');
  const modalTitle = el('#modalTitle');
  const modalBody = el('#modalBody');
  const closeModalBtn = el('#closeModal');
  const editShipmentBtn = el('#editShipmentBtn');
  const deleteShipmentBtn = el('#deleteShipmentBtn');
  const modalSaveBtn = el('#modalSaveBtn');

  const confirmModal = el('#confirmModal');
  const confirmText = el('#confirmText');
  const confirmYes = el('#confirmYes');

  let currentViewShipment = null;

  function renderTable(list = shipments) {
    tableBody.innerHTML = '';
    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="color:var(--muted)">No shipments found</td></tr>`;
      return;
    }
    list.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.sender}</td>
        <td>${s.recipient}</td>
        <td><strong>${s.tracking}</strong></td>
        <td><span class="status-pill ${statusClass(s.status)}">${statusIcon(s.status)} ${s.status}</span></td>
        <td>${s.flight || '-'}</td>
        <td>
          <button class="btn btn-small" data-action="view" data-id="${s.id}"><i class="fas fa-eye"></i></button>
          <button class="btn btn-small" data-action="edit" data-id="${s.id}"><i class="fas fa-edit"></i></button>
        </td>`;
      tableBody.appendChild(tr);
    });
  }

  function statusClass(status) {
    if (status === 'Pending') return 'status-pending';
    if (status === 'In Transit') return 'status-intransit';
    if (status === 'Delivered') return 'status-delivered';
    return '';
  }
  function statusIcon(status) {
    if (status === 'Pending') return '<i class="fas fa-hourglass-half"></i>';
    if (status === 'In Transit') return '<i class="fas fa-plane"></i>';
    if (status === 'Delivered') return '<i class="fas fa-check-circle"></i>';
    return '';
  }

  function openShipmentModal(s) {
    currentViewShipment = s;
    shipmentModal.setAttribute('aria-hidden', 'false');
    modalTitle.textContent = `Shipment ${s.tracking}`;
    modalBody.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><strong>Sender</strong><div>${s.sender}</div></div>
        <div><strong>Recipient</strong><div>${s.recipient}</div></div>
        <div><strong>Flight</strong><div>${s.flight || '-'}</div></div>
        <div><strong>Weight</strong><div>${s.weightKg} kg</div></div>
      </div>
      <div style="margin-top:12px">
        <strong>Status</strong>
        <div id="modalStatus" style="margin-top:6px">${s.status}</div>
      </div>
      <hr>
      <div><strong>History</strong>
        <ul style="margin-top:8px">
          ${s.history.map(h => `<li style="color:var(--muted)">${formatDateISO(h.time)} — ${h.text}</li>`).join('')}
        </ul>
      </div>
    `;
    editShipmentBtn.style.display = 'inline-flex';
    deleteShipmentBtn.style.display = 'inline-flex';
    modalSaveBtn.style.display = 'none';
  }

  function closeShipmentModal() {
    shipmentModal.setAttribute('aria-hidden', 'true');
    currentViewShipment = null;
  }

  function showConfirm(text, onYes) {
    confirmModal.setAttribute('aria-hidden', 'false');
    confirmText.textContent = text;
    function ok() {
      confirmModal.setAttribute('aria-hidden', 'true');
      confirmYes.removeEventListener('click', ok);
      onYes();
    }
    confirmYes.addEventListener('click', ok);
    // cancel buttons
    elAll('[data-close="confirmModal"]').forEach(b => b.addEventListener('click', () => confirmModal.setAttribute('aria-hidden', 'true')));
  }

  // event delegation on table for view/edit
  tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = Number(btn.dataset.id);
    const s = shipments.find(x => x.id === id);
    if (!s) return;
    if (action === 'view') openShipmentModal(s);
    if (action === 'edit') {
      openShipmentModal(s);
      enterEditMode();
    }
  });

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeShipmentModal);
  if (deleteShipmentBtn) deleteShipmentBtn.addEventListener('click', () => {
    showConfirm('Delete this shipment? This action cannot be undone.', () => {
      shipments = shipments.filter(x => x.id !== currentViewShipment.id);
      pushActivity(`Shipment ${currentViewShipment.tracking} deleted`);
      persist();
      renderTable();
      closeShipmentModal();
    });
  });

  function enterEditMode() {
    if (!currentViewShipment) return;
    modalBody.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label>Sender <input id="editSender" value="${escapeHtml(currentViewShipment.sender)}"></label>
        <label>Recipient <input id="editRecipient" value="${escapeHtml(currentViewShipment.recipient)}"></label>
        <label>Flight <input id="editFlight" value="${escapeHtml(currentViewShipment.flight || '')}"></label>
        <label>Weight (kg) <input id="editWeight" type="number" value="${currentViewShipment.weightKg}"></label>
      </div>
      <div style="margin-top:12px">
        <label>Status
          <select id="editStatus">
            <option ${currentViewShipment.status==='Pending'?'selected':''}>Pending</option>
            <option ${currentViewShipment.status==='In Transit'?'selected':''}>In Transit</option>
            <option ${currentViewShipment.status==='Delivered'?'selected':''}>Delivered</option>
          </select>
        </label>
      </div>
    `;
    editShipmentBtn.style.display = 'none';
    deleteShipmentBtn.style.display = 'none';
    modalSaveBtn.style.display = 'inline-flex';
    modalSaveBtn.onclick = () => {
      // save edits
      const sender = el('#editSender').value.trim();
      const recipient = el('#editRecipient').value.trim();
      const flight = el('#editFlight').value.trim() || null;
      const weightKg = Number(el('#editWeight').value) || 0;
      const status = el('#editStatus').value;
      currentViewShipment.sender = sender; currentViewShipment.recipient = recipient;
      currentViewShipment.flight = flight; currentViewShipment.weightKg = weightKg;
      if (currentViewShipment.status !== status) {
        currentViewShipment.status = status;
        currentViewShipment.history = currentViewShipment.history || [];
        currentViewShipment.history.push({ time: new Date().toISOString(), text: `Status changed to ${status}`});
      }
      pushActivity(`Shipment ${currentViewShipment.tracking} updated`);
      persist();
      renderTable();
      closeShipmentModal();
    };
  }

  // search & filter
  function filterAndRender() {
    const q = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    let results = shipments.slice();
    if (status !== 'all') results = results.filter(s => s.status === status);
    if (q) {
      results = results.filter(s =>
        s.sender.toLowerCase().includes(q) ||
        s.recipient.toLowerCase().includes(q) ||
        s.tracking.toLowerCase().includes(q)
      );
    }
    renderTable(results);
  }

  searchBtn.addEventListener('click', filterAndRender);
  searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') filterAndRender(); });
  statusFilter.addEventListener('change', filterAndRender);

  // open New shipment form (simple inline)
  const openNewShipment = el('#openNewShipment');
  if (openNewShipment) {
    openNewShipment.addEventListener('click', () => {
      const newId = Math.max(0, ...shipments.map(s => s.id)) + 1;
      const defaultTracking = `HM-2025-${String(newId).padStart(5,'0')}`;
      const newShipment = {
        id: newId,
        sender: "New Sender",
        recipient: "New Recipient",
        tracking: defaultTracking,
        status: "Pending",
        flight: null,
        origin: '',
        destination: '',
        weightKg: 0,
        history: [{ time: new Date().toISOString(), text: "Shipment created" }]
      };
      shipments.unshift(newShipment);
      pushActivity(`Shipment ${newShipment.tracking} created`);
      persist();
      renderTable();
      openShipmentModal(newShipment);
      enterEditMode();
    });
  }

  renderTable();
}

/* -------------------------
   Flights page logic
   ------------------------- */
function initFlights() {
  if (!document.body.classList.contains('page-flights')) return;

  const flightsList = el('#flightsList');
  const flightDetail = el('#flightDetail');
  const flightModal = el('#flightModal');
  const flightModalBody = el('#flightModalBody');
  const flightModalTitle = el('#flightModalTitle');
  const closeFlightModal = el('#closeFlightModal');

  function renderFlights() {
    flightsList.innerHTML = flights.map(f => {
      const assignedCount = f.assigned?.length || 0;
      return `
        <article class="card flight-card" data-id="${f.flightNumber}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <h3 style="margin:0">${f.flightNumber} <small style="color:var(--muted);font-size:12px">• ${f.status}</small></h3>
              <div style="color:var(--muted)">${f.origin} → ${f.destination}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:700">${assignedCount} pkgs</div>
              <div style="color:var(--muted);font-size:13px">${formatDateISO(f.etd)} → ${formatDateISO(f.eta)}</div>
              <div style="margin-top:8px">
                <button class="btn btn-small" data-action="view" data-id="${f.flightNumber}"><i class="fas fa-eye"></i> View</button>
                <button class="btn btn-small" data-action="edit" data-id="${f.flightNumber}"><i class="fas fa-edit"></i></button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
    // attach listeners
    flightsList.querySelectorAll('[data-action]').forEach(b => {
      b.addEventListener('click', (ev) => {
        const action = b.dataset.action;
        const id = b.dataset.id;
        const f = flights.find(x => x.flightNumber === id);
        if (!f) return;
        if (action === 'view') openFlightDialog(f);
        if (action === 'edit') openFlightDialog(f); // combined for demo (edit available in modal)
      });
    });
  }

  function openFlightDialog(f) {
    flightModal.setAttribute('aria-hidden', 'false');
    flightModalTitle.textContent = `${f.flightNumber} • ${f.origin} → ${f.destination}`;
    const assigned = (f.assigned || []).map(id => shipments.find(s => s.id === id)).filter(Boolean);
    flightModalBody.innerHTML = `
      <div>
        <strong>ETD</strong> <div>${formatDateISO(f.etd)}</div>
        <strong>ETA</strong> <div>${formatDateISO(f.eta)}</div>
        <strong>Status</strong> <div>${f.status}</div>
      </div>
      <hr>
      <div><strong>Assigned Shipments (${assigned.length})</strong>
        <ul>
          ${assigned.map(s => `<li>${s.tracking} — ${s.recipient} <small style="color:var(--muted)">${s.status}</small></li>`).join('')}
        </ul>
      </div>
    `;
  }
  if (closeFlightModal) closeFlightModal.addEventListener('click', () => flightModal.setAttribute('aria-hidden', 'true'));

  // Create new flight quick action
  const openNewFlight = el('#openNewFlight');
  if (openNewFlight) {
    openNewFlight.addEventListener('click', () => {
      const newId = `HM${Math.floor(100 + Math.random()*900)}`;
      const now = new Date();
      const etd = new Date(now.getTime() + (24*60*60*1000)).toISOString();
      const eta = new Date(now.getTime() + (26*60*60*1000)).toISOString();
      const newFlight = {
        id: newId, flightNumber: newId, origin: "LHR", destination: "CDG", etd, eta, assigned: [], status: "Upcoming"
      };
      flights.unshift(newFlight);
      pushActivity(`Flight ${newFlight.flightNumber} created`);
      persist();
      renderFlights();
    });
  }

  renderFlights();
}

/* -------------------------
   Tracking page logic
   ------------------------- */
function initTracking() {
  if (!document.body.classList.contains('page-tracking')) return;

  const input = el('#trackingInput');
  const btn = el('#trackBtn');
  const result = el('#trackingResult');
  const err = el('#trackingError');
  const trackCode = el('#trackCode');
  const trackRoute = el('#trackRoute');
  const trackStatus = el('#trackStatus');
  const trackTimeline = el('#trackTimeline');

  let simInterval = null;

  function clearSim() {
    if (simInterval) {
      clearInterval(simInterval);
      simInterval = null;
    }
  }

  btn.addEventListener('click', () => {
    const code = input.value.trim();
    if (!code) {
      showError('Please enter a tracking code');
      return;
    }
    const s = shipments.find(x => x.tracking.toLowerCase() === code.toLowerCase());
    if (!s) {
      showError('Tracking code not found');
      return;
    }
    // show result
    err.style.display = 'none';
    result.style.display = 'block';
    trackCode.textContent = s.tracking;
    trackRoute.textContent = `${s.origin || '---'} → ${s.destination || '---'}`;
    trackStatus.innerHTML = `${statusIcon(s.status)} ${s.status}`;
    renderTimeline(s);

    // simulate real-time updates: push a new status every 4 seconds if not delivered
    clearSim();
    simInterval = setInterval(() => {
      const idx = ["Pending", "In Transit", "Delivered"].indexOf(s.status);
      if (idx < 2) {
        const next = ["Pending", "In Transit", "Delivered"][idx+1];
        s.status = next;
        s.history = s.history || [];
        s.history.push({ time: new Date().toISOString(), text: `Status updated to ${next}` });
        pushActivity(`Tracking ${s.tracking} status → ${next}`);
        trackStatus.innerHTML = `${statusIcon(s.status)} ${s.status}`;
        renderTimeline(s);
        persist();
      } else {
        clearSim();
      }
    }, 4000);
  });

  function renderTimeline(s) {
    trackTimeline.innerHTML = s.history.map(h => `<li><div style="font-weight:600">${h.text}</div><div style="font-size:12px;color:var(--muted)">${formatDateISO(h.time)}</div></li>`).join('');
  }

  function showError(t) {
    err.style.display = 'block';
    err.textContent = t;
    result.style.display = 'none';
  }

}

/* -------------------------
   Small utilities
   ------------------------- */
function escapeHtml(s = '') {
  return s.replace?.(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || s;
}

/* -------------------------
   Page boot
   ------------------------- */
function boot() {
  initDashboard();
  initShipments();
  initFlights();
  initTracking();
  // general attach: update nav active state
  const path = location.pathname.split('/').pop();
  const anchors = elAll('.nav-list a');
  anchors.forEach(a => {
    if (a.getAttribute('href') === path || (path === '' && a.getAttribute('href') === 'index.html')) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', boot);

// expose some functions for debugging in console (admin)
window.HM = {
  getShipments: () => shipments,
  getFlights: () => flights,
  addShipment: (obj) => { shipments.unshift(obj); pushActivity(`Shipment ${obj.tracking} added`); persist(); },
  deleteShipment: (id) => { shipments = shipments.filter(s => s.id !== id); pushActivity(`Shipment ${id} deleted`); persist(); },
  reloadData: () => { loadPersist(); boot(); }
};
