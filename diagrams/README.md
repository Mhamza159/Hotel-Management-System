# 🏨 Grand Horizon Hotel - System Diagrams & Visual Models

All diagrams are built using **Archify** with standalone interactive HTML viewers, live particle trace motion, and dark/light mode export capabilities.

---

## 📂 Folder Structure

```
diagrams/
├── index.html                           # 🌟 Interactive Master Dashboard
├── architecture/
│   ├── hotel-management-architecture.html
│   ├── hotel-management.architecture.json
│   ├── hotel-erd.html
│   ├── hotel-erd.architecture.json
│   └── hotel-erd-detailed.html               # 💎 Deep Field-Level Schema & FK Explorer
├── sequences/
│   ├── hotel-booking-sequence.html
│   ├── hotel-booking.sequence.json
│   ├── user-login-sequence.html
│   ├── user-login.sequence.json
│   ├── stripe-webhook-sequence.html
│   └── stripe-webhook.sequence.json
├── dataflows/
│   ├── system-overview-dataflow.html
│   ├── system-overview.dataflow.json
│   ├── user-registration-dataflow.html
│   └── user-registration.dataflow.json
├── workflows/
│   ├── booking-process-activity.html
│   ├── booking-process.workflow.json
│   ├── room-concurrency-workflow.html
│   ├── room-concurrency.workflow.json
│   ├── pbac-security-workflow.html
│   └── pbac-security.workflow.json
└── lifecycles/
    ├── booking-lifecycle-state.html
    ├── booking-lifecycle.lifecycle.json
    ├── room-operational-lifecycle.html
    └── room-operational.lifecycle.json
```

---

## 🚀 Quick Access Table

| Folder | Diagram File | Type | Description |
| :--- | :--- | :--- | :--- |
| **`architecture/`** | `hotel-management-architecture.html` | High-Level Architecture | Full-stack MERN component and service layout |
| **`architecture/`** | `hotel-erd.html` | Database ERD | Complete relational contracts across all 8 models |
| **`sequences/`** | `hotel-booking-sequence.html` | Sequence Diagram | Room reservation & Stripe payment handshakes |
| **`sequences/`** | `user-login-sequence.html` | Sequence Diagram | User login, bcrypt comparison, and JWT issuance |
| **`sequences/`** | `stripe-webhook-sequence.html` | Sequence Diagram | Asynchronous webhook reconciliation & PDF generation |
| **`dataflows/`** | `system-overview-dataflow.html` | Dataflow Pipeline | 5-stage symmetric end-to-end data pipeline |
| **`dataflows/`** | `user-registration-dataflow.html` | Dataflow Pipeline | Input ingestion, rate-limiting, and bcrypt hashing |
| **`workflows/`** | `booking-process-activity.html` | Activity / Workflow | Operational steps and cancellation refund tiers |
| **`workflows/`** | `room-concurrency-workflow.html` | Activity / Workflow | Atomic concurrency locking preventing double-bookings |
| **`workflows/`** | `pbac-security-workflow.html` | Activity / Workflow | PBAC permission evaluation and 403 audit logging |
| **`lifecycles/`** | `booking-lifecycle-state.html` | State Machine | Booking state progression from Draft to Checked-Out |
| **`lifecycles/`** | `room-operational-lifecycle.html` | State Machine | Physical room turnover from Available to Cleaning |

---

## 🖥️ How to View

Open `diagrams/index.html` directly in any modern browser (Chrome, Edge, Brave, Firefox):
```powershell
Start-Process "diagrams/index.html"
```
No web server required. All assets, SVGs, and viewer runtimes are 100% self-contained.
