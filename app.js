const $ = selector => document.querySelector(selector);
let routes = [];
let stops = [];
let timings = {};

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

  const verifiedTimes = Array.isArray(timings.verified_official)
    ? timings.verified_official.length
    : 0;

  $('#routeCount').textContent = routes.length;
  $('#stopCount').textContent = stops.length;
  $('#timingCount').textContent = verifiedTimes;

  renderRoutes(routes);
  $('#stopResults').innerHTML = stops
    .map(stop => `<span class="stop-chip">${esc(stop.name)}</span>`)
    .join('');

  renderTimings(timings);
}

function renderRoutes(list) {
  $('#routeResults').innerHTML = list.length
    ? list.map(route => `
      <article class="route-card">
        <span class="route-no">${esc(route.route_no)}</span>
        <div>
          <strong>${esc(route.from)} → ${esc(route.to)}</strong>
          <small>Published route endpoints · intermediate stops may not be available</small>
        </div>
      </article>`).join('')
    : '<p>No matching route entry found.</p>';
}

function renderTimings(data) {
  const verified = Array.isArray(data.verified_official) ? data.verified_official : [];
  if (verified.length) {
    $('#timingResults').innerHTML = verified.map(item => `
      <article class="timing-entry">
        <h3>Route ${esc(item.route_no || '—')}</h3>
        <p>${esc(item.from || '')} → ${esc(item.to || '')}</p>
        <p><b>${esc(item.departure_time || '')}</b></p>
      </article>`).join('');
    return;
  }

  $('#timingResults').innerHTML = `
    <h3>Verified bus timings are not available yet</h3>
    <p>The currently available Coimbatore route data does not include verified route-specific departure times. No estimated or fictional timings are displayed.</p>
  `;
}

$('#search').addEventListener('submit', event => {
  event.preventDefault();
  const query = $('#q').value.trim().toLowerCase();
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