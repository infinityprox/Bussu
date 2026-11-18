# BusTrack India — Tamil Nadu MVP

A responsive static website starter for public transport information.

## Run locally
Open `index.html` in a browser. For a local web server, run:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000`.

## Deploy to GitHub Pages
1. Create a GitHub repository named `bustrack-india`.
2. Upload `index.html`, `style.css`, `app.js`, and the `data` folder.
3. Open repository **Settings → Pages**.
4. Choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
5. Wait for the Pages URL to appear.

## Current limitations
- The included route entries are DEMO placeholders, not verified bus services.
- Map pins are sample reference locations, not live buses.
- No official live GPS, arrival predictions, ticket booking or verified fare engine is connected.
- Leaflet, OpenStreetMap tiles and Google Fonts require an internet connection.

## Data integration plan
1. Obtain permission and check licence/attribution requirements for each dataset.
2. Start with CUMTA static GTFS datasets for Chennai where the portal provides them.
3. Review the Tamil Nadu OGD SETC routes/services/timings dataset.
4. Parse GTFS files: `agency.txt`, `routes.txt`, `trips.txt`, `stops.txt`, `stop_times.txt`, `calendar.txt`, and `shapes.txt`.
5. Convert the data to a compact JSON API or query it through a backend. Do not put private API keys in frontend JavaScript.
6. Add other Tamil Nadu operators/cities only when reliable data is obtained.
7. Add real-time tracking only with an authorized vehicle-location feed (e.g. GTFS-Realtime or an operator API).

## Suggested architecture for the next version
- Frontend: current HTML/CSS/JS or migrate to React/Vite.
- Data importer: Python GTFS parser.
- Database/API: PostgreSQL + PostGIS or Supabase.
- Hosting: GitHub Pages for static frontend; backend on a suitable hosting provider.
- Monitoring: data freshness timestamp, import logs, and broken-feed alerts.

## Data sources to review
- CUMTA: https://opendata.cumta.org/
- Tamil Nadu OGD SETC catalog: https://tn.data.gov.in/catalog/setc-bus-routes-services-and-timings
- TNSTC: https://www.tnstc.in/OTRSOnline/

Always display the dataset source and last-updated date. Confirm reuse rights and validate schedules with the operator before presenting them as current.
