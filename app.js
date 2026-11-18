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
    ? list.map(route => {
      const index = routes.indexOf(route);
      return `
        <article class="route-card">
          <button class="route-no route-open" type="button" data-route-index="${index}" aria-label="View route ${esc(route.route_no)}">${esc(route.route_no)}</button>
          <div>
            <button class="route-destination route-open" type="button" data-route-index="${index}">${esc(route.from)} → ${esc(route.to)}</button>
            <small>Tap bus number or destination to view route details</small>
          </div>
        </article>`;
    }).join('')
    : '<p>No matching route entry found.</p>';
}

function showRouteDetails(index) {
  const route = routes[Number(index)];
  if (!route) return;

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
      <div class="timeline-stop"><span class="timeline-dot"></span><div><small>FROM</small><strong>${esc(route.from)}</strong></div></div>
      <div class="timeline-line"></div>
      <div class="timeline-stop"><span class="timeline-dot end"></span><div><small>TO</small><strong>${esc(route.to)}</strong></div></div>
    </div>
    <p class="note">Only the published route endpoints are available here. Intermediate stops have not been confirmed for this route.</p>
    <h4>Bus timings</h4>
    ${timeCards}
  `;
  $('#routeDetail').scrollIntoView({behavior:'smooth',block:'start'});
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

$('#routeResults').addEventListener('click', event => {
  const trigger = event.target.closest('.route-open');
  if (trigger) showRouteDetails(trigger.dataset.routeIndex);
});

$('#routeDetail').addEventListener('click', event => {
  if (event.target.closest('#closeRouteDetail')) $('#routeDetail').hidden = true;
});

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