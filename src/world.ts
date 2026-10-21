export type Point = {x:number;y:number};
export type Road = {a:Point;b:Point;width:number};
export type Building = {points:Point[];color:string;height?:number};
export type World = {roads:Road[];buildings:Building[];parks:Point[];radius:number;origin:{lat:number;lng:number};name:string;demo:boolean};
export const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
export function closest(p:Point,r:Road):Point {
 const dx=r.b.x-r.a.x,dy=r.b.y-r.a.y;
 const t=clamp(((p.x-r.a.x)*dx+(p.y-r.a.y)*dy)/(dx*dx+dy*dy||1),0,1);
 return {x:r.a.x+dx*t,y:r.a.y+dy*t};
}
export function inside(p:Point,poly:Point[]) {
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
  const a=poly[i],b=poly[j];
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) hit=!hit;
 } return hit;
}
const collisionGrids=new WeakMap<Building[],Map<string,Building[]>>();
export function blocked(p:Point,w:World,radius=2) {
 if(Math.abs(p.x)>w.radius||Math.abs(p.y)>w.radius)return true;
 let grid=collisionGrids.get(w.buildings);
 if(!grid){grid=new Map();for(const b of w.buildings){if(!b.points.length)continue;const xs=b.points.map(p=>p.x),ys=b.points.map(p=>p.y);for(let x=Math.floor(Math.min(...xs)/64);x<=Math.floor(Math.max(...xs)/64);x++)for(let y=Math.floor(Math.min(...ys)/64);y<=Math.floor(Math.max(...ys)/64);y++){const key=`${x},${y}`,list=grid.get(key)||[];list.push(b);grid.set(key,list);}}collisionGrids.set(w.buildings,grid);}
 const nearby=new Set<Building>();for(let x=Math.floor((p.x-radius)/64);x<=Math.floor((p.x+radius)/64);x++)for(let y=Math.floor((p.y-radius)/64);y<=Math.floor((p.y+radius)/64);y++)for(const b of grid.get(`${x},${y}`)||[])nearby.add(b);
 return [...nearby].some(b=>inside(p,b.points)||b.points.some((a,i)=>{const q=closest(p,{a,b:b.points[(i+1)%b.points.length],width:0});return Math.hypot(p.x-q.x,p.y-q.y)<radius}));
}
export function demoWorld():World {
 const roads:Road[]=[],buildings:Building[]=[],parks:Point[]=[];
 const colors=['#8c8f87','#9a9c91','#a5a79a','#7c8683','#afb0a1'];
 for(let x=-800;x<=800;x+=160){roads.push({a:{x,y:-960},b:{x,y:960},width:22});roads.push({a:{x:-960,y:x},b:{x:960,y:x},width:22});}
 for(let x=-800;x<800;x+=160)for(let y=-800;y<800;y+=160){
  if((x/160+y/160+20)%7===0){parks.push({x:x+80,y:y+80});continue;}
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){
   const bx=x+26+i*64,by=y+26+j*64;
   buildings.push({points:[{x:bx,y:by},{x:bx+44,y:by},{x:bx+44,y:by+44},{x:bx,y:by+44}],color:colors[Math.abs(x+y+i+j)%colors.length]});
  }
 }
 return {roads,buildings,parks,radius:920,origin:{lat:48.2082,lng:16.3738},name:'Demo city',demo:true};
}
export function toLocal(lat:number,lng:number,origin:World['origin']):Point {return {x:(lng-origin.lng)*111320*Math.cos(origin.lat*Math.PI/180),y:-(lat-origin.lat)*111320};}
export function toGeo(p:Point,origin:World['origin']) {return {lat:origin.lat-p.y/111320,lng:origin.lng+p.x/(111320*Math.cos(origin.lat*Math.PI/180))};}
type OsmElement={type:string;tags?:Record<string,string>;geometry?:{lat:number;lon:number}[]};
export function parseRoads(elements:OsmElement[],origin:World['origin'],name:string):World {
 const roads:Road[]=[],buildings:Building[]=[];
 for(const e of elements){const pts=e.geometry?.map(p=>toLocal(p.lat,p.lon,origin));if(!pts?.length)continue;
  if(e.tags?.building)buildings.push({points:pts,color:'#c9bfae',height:clamp(parseFloat(e.tags.height||'')||Number(e.tags['building:levels']||4)*3.2,3,100)});
  else if(e.tags?.highway&&!['footway','steps','path','cycleway','pedestrian'].includes(e.tags.highway))for(let i=1;i<pts.length;i++)if(Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y)>3)roads.push({a:pts[i-1],b:pts[i],width:clamp(Number(e.tags.lanes||2)*3.3,6,18)});
 }
 if(!roads.length)throw new Error('No drivable streets found here. Try a nearby town or street.');
 return {roads,buildings,parks:[],radius:580,origin,name,demo:false};
}
export async function loadRoads(origin:World['origin'],name:string):Promise<World> {
 const query=`[out:json][timeout:15];(way[highway][area!=yes](around:800,${origin.lat},${origin.lng});way[building](around:800,${origin.lat},${origin.lng}););out geom;`;
 try {
  const res=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query),{signal:AbortSignal.timeout(16000)});
  if(!res.ok)throw new Error('Overpass unavailable');
  return parseRoads((await res.json()).elements,origin,name);
 }catch{
  const dx=.006/Math.cos(origin.lat*Math.PI/180),dy=.006;
  const box=[origin.lng-dx,origin.lat-dy,origin.lng+dx,origin.lat+dy].join(',');
  const res=await fetch('https://api.openstreetmap.org/api/0.6/map?bbox='+box,{signal:AbortSignal.timeout(25000)});
  if(!res.ok)throw new Error('Map data is unavailable right now. Try the included Vienna district.');
  return parseRoads(parseOsmXml(await res.text()),origin,name);
 }
}
export function parseOsmXml(xml:string):OsmElement[]{
 const doc=new DOMParser().parseFromString(xml,'text/xml');
 const nodes=new Map(Array.from(doc.querySelectorAll('node')).map(n=>[n.getAttribute('id'),{lat:Number(n.getAttribute('lat')),lon:Number(n.getAttribute('lon'))}]));
 return Array.from(doc.querySelectorAll('way')).map(w=>({type:'way',tags:Object.fromEntries(Array.from(w.querySelectorAll('tag')).map(t=>[t.getAttribute('k')!,t.getAttribute('v')!])),geometry:Array.from(w.querySelectorAll('nd')).map(n=>nodes.get(n.getAttribute('ref'))).filter((p):p is {lat:number;lon:number}=>!!p)}));
}
export async function viennaWorld(){const res=await fetch(`${import.meta.env.BASE_URL}data/vienna.json`);if(!res.ok)throw new Error('Could not load the included district.');const w=parseRoads((await res.json()).elements,{lat:48.2082,lng:16.3738},'Vienna · Innere Stadt');w.radius=380;return w;}
let lastSearch=0;
export async function searchPlace(address:string){
 if(Date.now()-lastSearch<1200)throw new Error('Please wait a moment before searching again.');lastSearch=Date.now();
 const coordinates=address.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
 if(coordinates){const lat=Number(coordinates[1]),lng=Number(coordinates[2]);if(Math.abs(lat)>80||Math.abs(lng)>180)throw new Error('Choose coordinates within ±80° latitude and ±180° longitude.');return {origin:{lat,lng},name:address};}
 const res=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='+encodeURIComponent(address),{signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw new Error('Location search is busy. You can enter latitude, longitude instead.');const data=await res.json();if(!data.length)throw new Error('Location not found. Try a city and country.');
 const lat=Number(data[0].lat);if(Math.abs(lat)>80)throw new Error('Choose a location below 80° latitude.');return {origin:{lat,lng:Number(data[0].lon)},name:String(data[0].display_name)};
}
