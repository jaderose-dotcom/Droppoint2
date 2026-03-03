# Droppoint Performance Dashboard

DIFOT (Delivered In Full On Time) analytics dashboard for monitoring Droppoint delivery performance across Fuji and Droppoint customers.

## Features

- **Overview** — KPI cards, DIFOT by state, delivery status breakdown, clickable late counts
- **Active Bookings** — Live view of in-progress deliveries
- **Delivery History** — Filterable by speed tier (VIP, 3-hour, Same Day)
- **By Pickup** — Performance breakdown by pickup location
- **By Driver** — Driver leaderboard with DIFOT scores and average delays
- **Timing Analysis** — Best/worst performing hours of day
- **Delays** — All late deliveries with search, sorting, and late reason tracking

### Booking Detail Modal
- Date, speed, courier, distance, state
- SLA calculation (VIP: 90m/120m/150m by distance, 3-hour: 180m, Same Day: by requested drop time)
- Expected vs actual delivery time
- Booking → Pickup and Pickup → Delivery timing
- Late reason assignment (18 predefined reason codes)
- Notes system with persistence

### Customer Filtering
- **Fuji**: PO numbers starting with `ANC`, `A&C`, or `FBAU`
- **Droppoint**: All other PO numbers

## Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

Opens [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
```

Builds the app to the `build` folder, ready for deployment.

## Tech Stack

- React 18
- Recharts (charts and visualisations)
- Lucide React (icons)
- Zoom2u brand colour system

## Data

Delivery data is embedded in `src/Dashboard.jsx` from the source spreadsheet. To update data, replace the `RAW_DATA` constant with fresh export data.

Notes are persisted to `localStorage` under the key `droppoint-dashboard-notes`.

## Colour Palette (Zoom2u)

| Colour | Hex | Usage |
|--------|-----|-------|
| Grey | `#4B5054` | Primary text, headers |
| Blue | `#00A7E2` | Primary accent, CTAs, links |
| Melon | `#FD5373` | Late/danger states |
| Green | `#76D750` | On-time/success states |
| Yellow | `#FFD100` | Warnings, Same Day badge |
