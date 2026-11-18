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
  const thirdParty = Array.isArray(data.third_party_unverified) ? data.third_party_unverified : [];

  const verifiedHtml = verified.map(item => `
    <article class="timing-entry">
      <h3>Route ${esc(item.route_no || '—')} <span class="tag">Official</span></h3>
      <p>${esc(item.from || '')} → ${esc(item.to || '')}</p>
      <p><b>${esc(item.departure_time || '')}</b></p>
    </article>`).join('');

  const thirdPartyHtml = thirdParty.map(item => `
    <article class="timing-entry">
      <h3>Route ${esc(item.route_no || '—')} <span class="tag warn">Unverified</span></h3>
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