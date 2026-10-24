import {createIcon} from './icons.mjs';

export async function mountArchiveMap(container,places,{onOpen,copy,tileURL='https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution='© OpenStreetMap contributors'}={}){
 const {default:L}=await import('leaflet');await import('leaflet/dist/leaflet.css');
 if(!container.isConnected)return null;
 const located=places.filter(place=>place.world==='real' && Number.isFinite(place.coordinates?.lat) && Number.isFinite(place.coordinates?.lng));
 if(!located.length)return null;
 const map=L.map(container,{scrollWheelZoom:false,zoomControl:false,preferCanvas:true}),markers=[];
 map.attributionControl.setPrefix(false);
 map.attributionControl.setPosition('bottomleft');
 const controls=L.control.zoom({position:'topleft'}).addTo(map);
 for(const [selector,icon,title]of [['.leaflet-control-zoom-in','plus',copy.zoomIn],['.leaflet-control-zoom-out','minus',copy.zoomOut]]){const control=controls.getContainer().querySelector(selector);control.replaceChildren(createIcon(icon));control.setAttribute('title',title);control.setAttribute('aria-label',title);}
 let layer;
 try{const url=new URL(tileURL);if(url.protocol!=='https:' || !['{z}','{x}','{y}'].every(token=>tileURL.includes(token)))throw Error('invalid_tiles');
  const credit=attribution==='© OpenStreetMap contributors'?'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>':attribution.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  layer=L.tileLayer(tileURL,{maxZoom:19,attribution:credit,referrerPolicy:'strict-origin-when-cross-origin'}).addTo(map);
 }catch{map.remove();throw Error('invalid_tiles');}
 const status=document.createElement('p');status.className='archive-map-status';status.setAttribute('role','status');container.after(status);
 layer.on('tileerror',()=>status.textContent=copy.mapUnavailable);
 located.forEach((place,index)=>{
  const icon=document.createElement('span');icon.className='archive-map-pin';icon.textContent=String(index+1);
  const marker=L.marker([place.coordinates.lat,place.coordinates.lng],{title:place.title,alt:place.title,keyboard:true,icon:L.divIcon({className:'archive-map-marker',html:icon,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map);
  const content=document.createElement('div'),heading=document.createElement('strong'),open=document.createElement('button'),close=document.createElement('button');heading.textContent=place.title;open.type='button';open.textContent=copy.open;open.addEventListener('click',()=>onOpen(place.entities[0]));close.type='button';close.setAttribute('aria-label',copy.close);close.append(createIcon('x'));close.addEventListener('click',()=>marker.closePopup());content.append(heading,document.createElement('br'),open,close);marker.bindPopup(content,{closeButton:false});markers.push(marker);
 });
 map.fitBounds(L.featureGroup(markers).getBounds(),{padding:[36,36],maxZoom:14});
 let routeLayer,removed=false;
 const resize=new ResizeObserver(()=>map.invalidateSize({animate:false}));resize.observe(container);
 return {
  setRoute(rows){routeLayer?.remove();const points=rows.filter(row=>row.coordinates).map(row=>[row.coordinates.lat,row.coordinates.lng]);routeLayer=points.length>1?L.polyline(points,{color:'#756858',dashArray:'6 5',weight:2}).addTo(map):null;},
  destroy(){if(removed)return;removed=true;resize.disconnect();map.remove();status.remove();},
 };
}
