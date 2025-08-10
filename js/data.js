// sample data for shipments and flights
// Exported as ES6 modules

export const shipments = [
  {
    id: 1,
    sender: "H&M London DC",
    recipient: "Zara Store NY",
    tracking: "HM-2025-00001",
    status: "Pending",
    flight: "HM451",
    origin: "LHR",
    destination: "JFK",
    weightKg: 120,
    history: [
      { time: "2025-08-09T08:30:00Z", text: "Created at London DC" }
    ]
  },
  {
    id: 2,
    sender: "H&M Stockholm",
    recipient: "Boutique LA",
    tracking: "HM-2025-00002",
    status: "In Transit",
    flight: "HM412",
    origin: "ARN",
    destination: "LAX",
    weightKg: 90,
    history: [
      { time: "2025-08-08T09:00:00Z", text: "Loaded onto flight HM412" }
    ]
  },
  {
    id: 3,
    sender: "H&M Berlin",
    recipient: "Shop Berlin Centrum",
    tracking: "HM-2025-00003",
    status: "Delivered",
    flight: "HM400",
    origin: "BER",
    destination: "BER",
    weightKg: 20,
    history: [
      { time: "2025-08-06T10:15:00Z", text: "Delivered to recipient" }
    ]
  }
];

// flights
export const flights = [
  {
    id: "HM451",
    flightNumber: "HM451",
    origin: "LHR",
    destination: "JFK",
    etd: "2025-08-10T10:45:00Z",
    eta: "2025-08-10T14:50:00Z",
    assigned: [1],
    status: "Active"
  },
  {
    id: "HM412",
    flightNumber: "HM412",
    origin: "ARN",
    destination: "LAX",
    etd: "2025-08-11T07:00:00Z",
    eta: "2025-08-11T13:30:00Z",
    assigned: [2],
    status: "Upcoming"
  },
  {
    id: "HM400",
    flightNumber: "HM400",
    origin: "BER",
    destination: "BER",
    etd: "2025-08-06T09:00:00Z",
    eta: "2025-08-06T09:40:00Z",
    assigned: [3],
    status: "Completed"
  }
];
