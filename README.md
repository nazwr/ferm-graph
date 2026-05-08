# Fermentation Chart

Dark-mode fermentation chart that pulls live data from Airtable and renders animated Brix and temperature curves.

## Setup

### 1. Install dependencies

```bash
cd fermentation-chart
npm install
```

### 2. Configure your Airtable token

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder with your real token:

```
AIRTABLE_TOKEN=patXXXXXXXXXXXXXX
```

### 3. Run locally

```bash
node server.js
```

Then open your browser to:

```
http://localhost:3000/?batch=Batch+2601
```

Optional URL parameters:

| Param | Example | Description |
|-------|---------|-------------|
| `batch` | `Batch+2601` | Airtable table name (**required**) |
| `setpoint` | `54` | Draws a dashed orange reference line at this °F value |
| `title` | `Batch+2601` | Chart title (defaults to the batch name) |

Example with all params:

```
http://localhost:3000/?batch=Batch+2601&setpoint=54&title=Batch+2601
```

## Deploy to Netlify

1. Drag and drop the `fermentation-chart` folder to [Netlify Drop](https://app.netlify.com/drop).
2. Once deployed, go to **Site settings → Environment variables**.
3. Add a variable: **Key** `AIRTABLE_TOKEN` / **Value** your Airtable API token.
4. Go to **Deploys** and click **Trigger deploy → Deploy site** so the function picks up the new variable.
5. Open your Netlify URL with `?batch=Batch+2601` to view the chart.

## Airtable data format

Each batch is its own table. Required columns:

| Column | Type | Notes |
|--------|------|-------|
| `Date` | Date (ISO `YYYY-MM-DD`) | Required |
| `Brix` | Number | Required |
| `Temp` | Number | Required |
| `pH`   | Number | Optional — shown in tooltip when present |
| `Notes`| Long text | Optional |

## How it works

- **Locally**: `server.js` reads `.env`, proxies requests to the Airtable REST API, and serves the chart at `http://localhost:3000/`.
- **On Netlify**: `netlify/functions/data.js` does the same thing as a serverless function, reading `AIRTABLE_TOKEN` from Netlify's environment. The chart HTML detects `localhost` vs a deployed domain and hits the right endpoint automatically.
- Airtable pagination is handled transparently — batches with more than 100 records are fetched in multiple pages and merged.
