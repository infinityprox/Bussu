# Bussu — Coimbatore

Bussu is a responsive static website for exploring published Coimbatore city bus route endpoints, known endpoints and available timing information.

## Run locally

Open `index.html` in a browser. For a local web server, run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy with GitHub Pages

1. Open repository **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select `main` and `/ (root)`, then save.
4. Wait for the GitHub Pages URL to appear.

## Data limitations

- Route entries represent published origin and destination endpoints; they do not establish every intermediate stop.
- The stops list contains known route endpoints, not a complete verified stop inventory.
- No verified route-specific departure-time records are currently available, so the website does not display estimated or invented times.
- No official live GPS, arrival predictions, ticket booking or fare engine is connected.

## Data structure

- `data/routes.json`: published route numbers and endpoints.
- `data/stops.json`: known route endpoint names.
- `data/timings.json`: verified and unverified schedule record containers.

Add new route, stop or timing records only when supported by reliable, identifiable evidence.

## Pasi — AI recipe assistant

A separate single-page recipe app is available at `/pasi.html`. The Claude API key is kept on the server in `api/recipes.js`; it is never included in browser code.

### Deploy Pasi

GitHub Pages only hosts static files and cannot run the secure API endpoint. Deploy this repository on Vercel to use recipe generation:

1. Import `infinityprox/Bussu` into Vercel.
2. In **Project Settings → Environment Variables**, add `ANTHROPIC_API_KEY` with your Anthropic API key.
3. Redeploy the project.
4. Open `/pasi.html` on the Vercel deployment.

Do not put the API key in `pasi.html`, a public GitHub file, or any frontend environment variable. Claude API usage may incur charges.
