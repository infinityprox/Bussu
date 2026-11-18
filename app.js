const toastEl=document.getElementById("toast");
function toast(message){toastEl.textContent=message;toastEl.classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>toastEl.classList.remove("show"),2800)}
const options=[...document.querySelectorAll(".bus-option")];
options.forEach(option=>option.addEventListener("click",()=>{options.forEach(x=>x.classList.remove("selected"));option.classList.add("selected");document.getElementById("estimate").textContent=option.dataset.time;document.getElementById("fare").textContent=option.dataset.fare;}));
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));btn.classList.add("active");toast(btn.dataset.filter+" preference selected");}));
document.getElementById("swap").addEventListener("click",()=>{const a=document.getElementById("from"),b=document.getElementById("to");[a.value,b.value]=[b.value,a.value];toast("Pickup and destination swapped");});
document.getElementById("findBus").addEventListener("click",()=>toast("Live bus results are not connected yet. This is a UI preview."));
let map;
if(window.L){
 map=L.map("map",{zoomControl:false,scrollWheelZoom:false}).setView([11.0168,76.9558],14);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
 L.control.zoom({position:"bottomright"}).addTo(map);
 const start=[11.0186,76.9674],end=[10.9947,76.9615],via=[11.011,76.964],via2=[11.002,76.960];
 const route=L.polyline([start,via,via2,end],{color:"#087b91",weight:5,opacity:.9,lineCap:"round"}).addTo(map);
 const icon=(emoji)=>L.divIcon({className:"",html:`<div class="bus-marker">${emoji}</div>`,iconSize:[30,30],iconAnchor:[15,15]});
 L.marker(start,{icon:icon("📍")}).addTo(map).bindPopup("Gandhipuram Bus Stand");
 L.marker(end,{icon:icon("📍")}).addTo(map).bindPopup("Ukkadam Bus Stand");
 [via,via2].forEach(p=>L.circleMarker(p,{radius:5,color:"#087b91",weight:3,fillColor:"#fff",fillOpacity:1}).addTo(map));
 L.marker([11.008,76.962],{icon:icon("🚌")}).addTo(map).bindPopup("Sample bus marker — not live");
 map.fitBounds(route.getBounds(),{padding:[55,55]});
 document.getElementById("layers").addEventListener("click",()=>map.fitBounds(route.getBounds(),{padding:[55,55]}));
 document.getElementById("locate").addEventListener("click",()=>{if(!navigator.geolocation){toast("Location is not supported on this device");return;}toast("Requesting your location…");navigator.geolocation.getCurrentPosition(pos=>{map.setView([pos.coords.latitude,pos.coords.longitude],15);L.circleMarker([pos.coords.latitude,pos.coords.longitude],{radius:8,color:"#fff",weight:3,fillColor:"#087b91",fillOpacity:1}).addTo(map).bindPopup("Your location").openPopup();},()=>toast("Location permission was not granted"));});
 setTimeout(()=>map.invalidateSize(),250);
}else{document.getElementById("map").innerHTML='<div style="padding:30px">Map unavailable. Check your internet connection.</div>';}