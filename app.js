// BusTrack India starter app. Replace sample routes with verified, licensed data before launch.
const sampleRoutes = [
  {id:"CB-DEMO-01", from:"Coimbatore", to:"Gandhipuram", via:"Sample city connection", operator:"Demo entry", type:"Sample route"},
  {id:"CB-DEMO-02", from:"Coimbatore", to:"Ukkadam", via:"Sample city connection", operator:"Demo entry", type:"Sample route"},
  {id:"CH-DEMO-01", from:"Chennai", to:"Central Bus Stand", via:"Sample city connection", operator:"Demo entry", type:"Sample route"},
  {id:"MD-DEMO-01", from:"Madurai", to:"Central Bus Stand", via:"Sample city connection", operator:"Demo entry", type:"Sample route"}
];

const normalise = value => value.trim().toLowerCase();
const form = document.querySelector("#route-form");
const results = document.querySelector("#route-results");

form.addEventListener("submit", event => {
  event.preventDefault();
  const from = normalise(document.querySelector("#from").value);
  const to = normalise(document.querySelector("#to").value);
  if (!from || !to) return;
  const matches = sampleRoutes.filter(route =>
    normalise(route.from) === from && normalise(route.to) === to
  );
  results.innerHTML = "";
  if (!matches.length) {
    results.innerHTML = `<div class="no-result">No matching entry in the starter dataset. This does not mean no bus service exists. Add verified route data for this journey.</div>`;
    return;
  }
  matches.forEach(route => {
    const card = document.createElement("article");
    card.className = "route-result";
    const info = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = `${route.from} → ${route.to}`;
    const detail = document.createElement("p");
    detail.textContent = `${route.id} · ${route.via} · ${route.operator}`;
    const tag = document.createElement("span");
    tag.className = "route-type";
    tag.textContent = route.type;
    info.append(title, detail);
    card.append(info, tag);
    results.append(card);
  });
});

document.querySelectorAll("[data-city]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelector("#from").value = button.dataset.city;
    document.querySelector("#to").focus();
    document.querySelector("#journey").scrollIntoView({behavior:"smooth"});
  });
});

// Map shows sample reference points, not buses or a live vehicle feed.
const map = L.map("map").setView([11.0168, 76.9558], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
const points = [
  {name:"Coimbatore (reference)", coords:[11.0168,76.9558]},
  {name:"Gandhipuram (reference)", coords:[11.0183,76.9674]},
  {name:"Ukkadam (reference)", coords:[10.9925,76.9614]}
];
points.forEach(point => L.marker(point.coords).addTo(map).bindPopup(point.name));
