# Droppoint Performance Dashboard

DIFOT (Delivered In Full On Time) analytics dashboard for Zoom2u Droppoint deliveries.

## Features

- **Overview** — KPIs, DIFOT by state, delivery status pie chart, state performance table
- **Active Bookings** — Live delivery tracking with status, progress, courier details
- **Delivery History** — Full searchable/filterable history with expanded details showing:
  - Booking time, SLA, requested/actual pickup times, expected/actual delivery times
  - Delay breakdown, courier, distance, notes
- **By Speed** — VIP / 3 Hour / Same Day performance + distance breakdown
- **By Pickup** — Breakdown by pickup location (Fuji locations highlighted with summary)
- **By Driver** — Late analysis per courier with DIFOT ranking, avg delay, timing metrics
- **Timing Analysis** — Booking→Pickup and Pickup→Delivery time analysis with:
  - Distribution charts, speed breakdowns, DIFOT correlation, per-driver timing
- **Time of Day** — DIFOT by day of week and hour of day
- **Delays** — Severity categories, distance breakdown, detailed drill-down

## Data Sources

The dashboard attempts to load data from Google Sheets CSV. If unavailable, it falls back to realistic generated demo data.

### Google Sheets Configuration

Update these URLs in `src/Dashboard.jsx`:

```javascript
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/.../pub?output=csv';
const GOOGLE_SHEET_NOTES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/.../pub?output=csv';
```

**Publishing your sheet:**
1. Open your Google Sheet
2. Go to File → Share → Publish to web
3. Select the bookings tab → CSV format → Publish
4. Repeat for the notes tab

### Expected CSV Columns (Bookings)

| Column | Description |
|--------|-------------|
| Booking Ref | Unique booking reference (e.g. Z202501271234567) |
| PO | Purchase order number |
| Courier | Courier/driver name |
| Pickup Address | Origin address |
| Drop Address | Destination address |
| Date | Booking date (YYYY-MM-DD or DD/MM/YYYY) |
| State | Australian state (NSW, VIC, QLD, WA, SA, ACT) |
| Speed | Service type (VIP, 3 hour, Same day) |
| Distance | Distance category (0-30km, 30.01-50km, 50.01+km) |
| On Time | Whether delivered on time (true/false, Y/N, 1/0) |
| Overdue Mins | Minutes past SLA (0 = on time) |
| Booking Time | Time booking was created (HH:MM) |
| Requested Pickup Time | Requested collection time (HH:MM) |
| Actual Pickup Time | When courier actually collected (HH:MM) |
| SLA Minutes | Expected SLA in minutes (e.g. 90, 180) |
| Expected Delivery Time | SLA deadline time (HH:MM) |
| Actual Delivery Time | When delivery was completed (HH:MM) |
| Booking to Pickup | Minutes from booking to pickup |
| Pickup to Delivery | Minutes from pickup to delivery |

### Expected CSV Columns (Notes)

| Column | Description |
|--------|-------------|
| Booking Ref | Reference to link note to booking |
| Note | The note text |

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build for Production

```bash
npm run build
```

Output goes to `dist/` folder.

## Tech Stack

- React 18 + Vite
- Recharts (charts)
- Lucide React (icons)
- PapaParse (CSV parsing)
- Zoom2u brand design system
