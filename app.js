const $ = selector => document.querySelector(selector);
let routes = [];
let stops = [];
let timings = {};
let favoriteRoutes = new Set();
let showingFavorites = false;
let bussuMap = null;
try { favoriteRoutes = new Set(JSON.parse(localStorage.getItem('bussu-favorite-routes') || '[]')); } catch (_) {}

const esc = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

async function init() {
  [routes, stops, timings] = await Promise.all([
    fetch('data/routes.json').then(response => {
      if (!response.ok) throw new Error('Routes could not be loaded');
      return response.json();
    }),
    fetch('data/stops.json').then(response => {
      if (!response.ok) throw new Error('Stops could not be loaded');
      return response.json();
    }),
    fetch('data/timings.json').then(response => {
      if (!response.ok) throw new Error('Timings could not be loaded');
      return response.json();
    })
  ]);

  const verifiedTimes = Array.isArray(timings.verified_official) ? timings.verified_official.length : 0;
  $('#routeCount').textContent = routes.length;
  $('#stopCount').textContent = new Set(stops.map(stop => stop.name)).size;
  $('#timingCount').textContent = verifiedTimes;

  renderRoutes(routes);
  initMap();
  updateFavoriteButton();
  $('#stopResults').innerHTML = [...new Set(stops.map(stop => stop.name))]
    .sort((a,b) => a.localeCompare(b))
    .map(name => `<span class="stop-chip stop-directory-item" data-stop-name="${esc(name.toLowerCase())}">${esc(name)}</span>`).join('');
  renderTimings(timings);
}

function initMap() {
  const mapElement = $('#bussuMap');
  if (!mapElement || typeof L === 'undefined' || bussuMap) return;
  bussuMap = L.map(mapElement, { scrollWheelZoom: false }).setView([11.0168, 76.9558], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(bussuMap);
  L.marker([11.0168, 76.9558]).addTo(bussuMap)
    .bindPopup('<strong>Coimbatore</strong><br>City map');
  setTimeout(() => bussuMap.invalidateSize(), 150);
}

function renderRoutes(list) {
  const container = $('#routeResults');
  if (!container) return;
  if (!list.length) {
    container.innerHTML = '<p>No matching route entry found.</p>';
    return;
  }

  container.innerHTML = list.map(route => {
    const index = routes.indexOf(route);
    return `
      <article class="route-card">
        <button class="route-no route-open" type="button" data-route-index="${index}" aria-label="View route ${esc(route.route_no)}">${esc(route.route_no)}</button>
        <div>
          <button class="route-destination route-open" type="button" data-route-index="${index}">${esc(route.from)} → ${esc(route.to)}</button>
          <small>Tap bus number or destination to view route details</small>
        </div>
        <button class="favorite-button" type="button" data-favorite-route="${esc(route.route_no)}">${favoriteRoutes.has(route.route_no) ? '★ Saved' : '☆ Save'}</button>
      </article>`;
  }).join('');

  container.querySelectorAll('[data-favorite-route]').forEach(button => {
    button.addEventListener('click', () => {
      const routeNo = button.dataset.favoriteRoute;
      if (favoriteRoutes.has(routeNo)) favoriteRoutes.delete(routeNo); else favoriteRoutes.add(routeNo);
      try { localStorage.setItem('bussu-favorite-routes', JSON.stringify([...favoriteRoutes])); } catch (_) {}
      const query = $('#q').value.trim().toLowerCase();
      renderRoutes(showingFavorites ? routes.filter(route => favoriteRoutes.has(route.route_no)) : routes.filter(route => (route.route_no + ' ' + route.from + ' ' + route.to).toLowerCase().includes(query)));
      updateFavoriteButton();
    });
  });
  container.querySelectorAll('.route-open').forEach(button => {
    button.addEventListener('click', () => showRouteDetails(button.dataset.routeIndex));
  });
}

function updateFavoriteButton() {
  const button = $('#showFavorites');
  if (button) button.textContent = showingFavorites ? 'Show all routes' : 'Show saved routes';
}

function showRouteDetails(index) {
  const route = routes[Number(index)];
  if (!route) return;

  const routeStages = stops
    .filter(stop => stop.type === 'route_stage' && String(stop.route_no) === String(route.route_no))
    .sort((a,b) => a.sequence - b.sequence);
  const directionGroups = [...new Set(routeStages.map(stop => stop.direction))].map(direction => ({
    direction, items: routeStages.filter(stop => stop.direction === direction)
  }));

  const mapsUrl = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(route.from + ', Coimbatore') + '&destination=' + encodeURIComponent(route.to + ', Coimbatore') + '&travelmode=transit';
  const stageHtml = directionGroups.length ? `
    <section class="route-stage-section">
      <h4>Stops <span class="tag">Third-party · Unverified</span></h4>
      <p class="note">These stop sequences come from third-party listings and have not been officially verified.</p>
      ${directionGroups.map(group => `
        <h5>${esc(group.direction)}</h5>
        <div class="route-timeline">
          ${group.items.map((stop,i) => `
            <div class="timeline-stop">
              <span class="timeline-dot ${i === group.items.length - 1 ? 'end' : ''}"></span>
              <div><small>${i === 0 ? 'START' : i === group.items.length - 1 ? 'END' : 'STOP ' + (i+1)}</small><strong>${esc(stop.name)}</strong></div>
            </div>
            ${i === group.items.length - 1 ? '' : '<div class="timeline-line"></div>'}
          `).join('')}
        </div>
        <small>Source: <a href="${esc(group.items[0].source_url)}" target="_blank" rel="noopener noreferrer">${esc(group.items[0].source)}</a></small>
      `).join('')}
    </section>` : '<p class="note">Intermediate stops have not been published or confirmed for this route.</p>';

  const allTimes = [
    ...(Array.isArray(timings.verified_official) ? timings.verified_official : []),
    ...(Array.isArray(timings.third_party_unverified) ? timings.third_party_unverified : [])
  ].filter(item => String(item.route_no).trim().toLowerCase() === String(route.route_no).trim().toLowerCase());

  const timeCards = allTimes.length ? allTimes.map(item => `
    <article class="detail-timing">
      <h4>Timetable <span class="tag">${item.status && item.status.includes('Third-party') ? 'Third-party Schedule' : 'Official'}</span></h4>
      <p>${esc(item.from_stop || item.from || '')} → ${esc(item.to || '')}</p>
      <div class="departure-times">${(item.departure_times || [item.departure_time].filter(Boolean))
        .map(time => `<span class="stop-chip">${esc(time)}</span>`).join('')}</div>
      ${item.source_url ? `<a href="${esc(item.source_url)}" target="_blank" rel="noopener noreferrer">View timetable source</a>` : ''}
    </article>`).join('') : '<p class="note">No route-specific timetable is available in the current dataset.</p>';

  $('#routeDetail').hidden = false;
  $('#routeDetail').innerHTML = `
    <div class="detail-heading">
      <div><small>BUS ROUTE DETAILS</small><h3>Route ${esc(route.route_no)}</h3></div>
      <button type="button" class="detail-close" id="closeRouteDetail" aria-label="Close route details">✕</button>
    </div>
    <div class="route-timeline">
      <div class="timeline-stop"><span class="timeline-dot"></span><div><small>${route.source === 'CCMC' ? 'CCMC LISTED FROM' : 'THIRD-PARTY LISTED FROM'}</small><strong>${esc(route.from)}</strong></div></div>
      <div class="timeline-line"></div>
      <div class="timeline-stop"><span class="timeline-dot end"></span><div><small>${route.source === 'CCMC' ? 'CCMC LISTED TO' : 'THIRD-PARTY LISTED TO'}</small><strong>${esc(route.to)}</strong></div></div>
    </div>
    <a class="map-directions" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Open route directions in Google Maps ↗</a>
    ${stageHtml}
    <h4>Bus timings</h4>
    ${timeCards}
  `;
  $('#routeDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTimings(data) {
  const verified = Array.isArray(data.verified_official) ? data.verified_official : [];
  const thirdParty = Array.isArray(data.third_party_unverified) ? data.third_party_unverified : [];

  const verifiedHtml = verified.map(item => `
    <article class="timing-entry">
      <h3>Route ${esc(item.route_no || '—')} <span class="tag">Official</span></h3>
      <p>${esc(item.from || '')} → ${esc(item.to || '')}</p>
      <p><b>${esc(item.departure_time || '')}</b></p>
    </article>`).join('');

  const thirdPartyHtml = thirdParty.map(item => `
    <article class="timing-entry">
      <h3>Route ${esc(item.route_no || '—')} <span class="tag">Third-party Schedule</span></h3>
      <p>${esc(item.from_stop || '')} → ${esc(item.to || '')}</p>
      <div class="departure-times">
        ${(Array.isArray(item.departure_times) ? item.departure_times : [])
          .map(time => `<span class="stop-chip">${esc(time)}</span>`).join('')}
      </div>
      <small>Third-party reference schedule · may change. Confirm before travel.</small>
      <p><a href="${esc(item.source_url || '#')}" target="_blank" rel="noopener noreferrer">Source: ${esc(item.source_name || 'Third-party timetable')}</a></p>
    </article>`).join('');

  $('#timingResults').innerHTML = `
    ${verifiedHtml}
    ${thirdPartyHtml}
    <p class="note">${esc(data.note || 'Timings can change. Confirm with the bus operator before travel.')}</p>
    ${verified.length ? '' : '<p class="note">No official departure times have been verified yet.</p>'}
    ${verified.length || thirdParty.length ? '' : '<h3>Bus timings are not available yet</h3>'}
  `;
}

$('#routeDetail').addEventListener('click', event => {
  if (event.target.closest('#closeRouteDetail')) $('#routeDetail').hidden = true;
});

$('#stopSearch').addEventListener('input', () => {
  const query = $('#stopSearch').value.trim().toLowerCase();
  document.querySelectorAll('.stop-directory-item').forEach(item => { item.hidden = !item.dataset.stopName.includes(query); });
});

$('#showFavorites').addEventListener('click', () => {
  showingFavorites = !showingFavorites;
  const query = $('#q').value.trim().toLowerCase();
  renderRoutes(showingFavorites ? routes.filter(route => favoriteRoutes.has(route.route_no)) : routes.filter(route => (route.route_no + ' ' + route.from + ' ' + route.to).toLowerCase().includes(query)));
  updateFavoriteButton();
});

$('#search').addEventListener('submit', event => {
  event.preventDefault();
  const query = $('#q').value.trim().toLowerCase();
  showingFavorites = false;
  updateFavoriteButton();
  renderRoutes(routes.filter(route =>
    (route.route_no + ' ' + route.from + ' ' + route.to).toLowerCase().includes(query)
  ));
  $('#routes').scrollIntoView({ behavior: 'smooth' });
});

init().catch(error => {
  console.error(error);
  $('#routeResults').textContent = 'Could not load route data. Please try again later.';
  $('#stopResults').textContent = 'Stop data could not be loaded.';
  $('#timingResults').textContent = 'Schedule data could not be loaded.';
});
