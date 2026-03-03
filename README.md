# Droppoint Performance Dashboard

## Quick Setup

### 1. Publish your Google Sheet

1. Open your Google Sheet with the booking data
2. Go to **File → Share → Publish to web**
3. In the dropdown, select the **correct tab** (the one with your data)
4. Change format from "Web page" to **CSV**
5. Click **Publish**
6. Copy the URL it gives you

### 2. Add the URL to the code

Open `src/dashboard.jsx` and find this line near the top:

```js
const GOOGLE_SHEET_CSV_URL = 'YOUR_GOOGLE_SHEET_CSV_URL_HERE';
```

Replace `YOUR_GOOGLE_SHEET_CSV_URL_HERE` with your published CSV URL.

### 3. Deploy to Vercel

1. Push all files to your GitHub repo
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **Add New Project** → select your repo
4. Vercel auto-detects Vite — just click **Deploy**
5. Your dashboard is live!

### To update data

Just update the Google Sheet — the dashboard reads from it each time it loads.

## Local Development

```bash
npm install
npm run dev
```

## Expected Google Sheet Columns

| Column | Type | Example |
|--------|------|---------|
| booking_ref | text | Z2025012712345 |
| po | text | LENO00123456 |
| courier | text | Michael Chen |
| pickup_address | text | Dock 26, 2 Millennium Court... |
| drop_address | text | 242 Parramatta Rd, Homebush NSW |
| date | date (YYYY-MM-DD) | 2025-01-27 |
| state | text | NSW |
| speed | text | VIP / 3 hour / Same day |
| distance_km | number | 24.5 |
| on_time | boolean | TRUE / FALSE |
| overdue_mins | number | 0 (if on time) or 45 |
| hour | number | 9 (24hr format) |
| status | text | delivered |
| customer_price_ex_gst | number | 45.50 |
| customer_price_inc_gst | number | 50.05 |
