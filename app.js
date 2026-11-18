const demoRoutes=[
 {id:"CB-DEMO-01",from:"Coimbatore",to:"Gandhipuram",via:"Illustrative city connection"},
 {id:"CB-DEMO-02",from:"Coimbatore",to:"Ukkadam",via:"Illustrative city connection"},
 {id:"CH-DEMO-01",from:"Chennai",to:"Koyambedu",via:"Illustrative city connection"}
];
const norm=s=>s.trim().toLowerCase();
document.querySelector("#routeForm").addEventListener("submit",e=>{
 e.preventDefault();const from=document.querySelector("#from").value.trim(),to=document.querySelector("#to").value.trim();
 const found=demoRoutes.filter(r=>norm(r.from)===norm(from)&&norm(r.to)===norm(to));const out=document.querySelector("#results");out.replaceChildren();
 if(!found.length){const p=document.createElement("p");p.className="fineprint";p.textContent="No match in the demo dataset. This does not mean no bus service exists. Verified routes must be added.";out.append(p);return;}
 found.forEach(r=>{const el=document.createElement("div");el.className="result";const info=document.createElement("div");const b=document.createElement("b");b.textContent=r.from+" → "+r.to;const s=document.createElement("small");s.textContent=r.id+" · "+r.via;info.append(b,s);const tag=document.createElement("span");tag.className="demo";tag.textContent="DEMO ONLY";el.append(info,tag);out.append(el);});
});
document.querySelector("#swap").addEventListener("click",()=>{const a=document.querySelector("#from"),b=document.querySelector("#to");[a.value,b.value]=[b.value,a.value]});
document.querySelectorAll("[data-city]").forEach(btn=>btn.addEventListener("click",()=>{document.querySelector("#from").value=btn.dataset.city;document.querySelector("#routes").scrollIntoView({behavior:"smooth"});document.querySelector("#to").focus()}));
document.querySelector("#nearby").addEventListener("click",()=>{const msg=document.querySelector("#locationMessage");if(!navigator.geolocation){msg.textContent="Location is not supported by this browser.";return;}msg.textContent="Requesting location…";navigator.geolocation.getCurrentPosition(()=>msg.textContent="Location received. Nearby stop results need verified stop data.",()=>msg.textContent="Location permission not granted. Search by city instead.")});
document.querySelector("#roundTrip").addEventListener("click",()=>alert("Round-trip search will be added in a future version."));
document.querySelector("#date").min=new Date().toISOString().slice(0,10);
