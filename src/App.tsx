import {useCallback,useEffect,useRef,useState} from 'react';
import {Game} from './Game';
import {viennaWorld,searchPlace,loadRoads,type World} from './world';
import {VEHICLES,type CarType} from './vehicles';
import type {Engine,Hud} from './engine';
export function App(){
 const [world,setWorld]=useState<World|null>(null),[hud,setHud]=useState<Hud>({speed:0,distance:0,onFoot:false,paused:true,message:''}),[started,setStarted]=useState(false),[location,setLocation]=useState('Vienna, Austria'),[vehicle,setVehicle]=useState<CarType>('coupe'),[key,setKey]=useState(''),[activeKey,setActiveKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[credits,setCredits]=useState('© OpenStreetMap contributors · ODbL');
 const engine=useRef<Engine|null>(null),autoStart=useRef(false);const onError=useCallback((s:string)=>{setError(s);if(engine.current)engine.current.paused=true;},[]);
 const onHud=useCallback((value:Hud)=>{setHud(value);if(autoStart.current&&engine.current){autoStart.current=false;engine.current.start();}},[]);
 useEffect(()=>{let active=true;viennaWorld().then(w=>{if(active)setWorld(w)}).catch(()=>{if(active)setError('The included district could not load. Reload the page.');});return()=>{active=false;};},[]);
 function drive(){if(!engine.current){setError('The 3D renderer is not ready. Reload with WebGL / hardware acceleration enabled.');return;}engine.current.start();setStarted(true);setError('');document.activeElement instanceof HTMLElement&&document.activeElement.blur();}
 async function launch(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');try{const isVienna=/^(vienna|wien)(,?\s*(austria|österreich))?$/i.test(location.trim());let next=world;if(!isVienna||!world?.name.startsWith('Vienna')){const result=await searchPlace(location.trim());next=await loadRoads(result.origin,result.name);}if(next!==world||activeKey!==key.trim()){autoStart.current=true;setWorld(next);setActiveKey(key.trim());setStarted(true);document.activeElement instanceof HTMLElement&&document.activeElement.blur();}else drive();}catch(e){setError(e instanceof Error?e.message:'This location could not load. Try Vienna, Austria.');}finally{setBusy(false);}}
 const menu=!started||hud.paused||!!error;
 return <main>
  {world&&<Game world={world} engine={engine} onHud={onHud} vehicle={vehicle} googleKey={activeKey} onCredits={setCredits} onError={onError}/>}
  {menu&&<div className="menu-backdrop"><section className="menu" aria-label="Location and car selection"><div className="wordmark">STREETSHIFT<span>/</span></div><h1>Pick a place.<br/>Pick a ride.</h1><form onSubmit={launch}>
   <label htmlFor="location">Location</label><input id="location" required value={location} maxLength={180} onChange={e=>setLocation(e.target.value)} placeholder="City, address or lat, lng"/>
   <fieldset><legend>Your car</legend><div className="cars">{(Object.keys(VEHICLES) as CarType[]).map(type=><label className={vehicle===type?'selected':''} key={type}><input type="radio" name="car" value={type} checked={vehicle===type} onChange={()=>setVehicle(type)}/><span className={'car-silhouette '+type}/><strong>{VEHICLES[type].name}</strong></label>)}</div></fieldset>
   <button className="drive" disabled={!world||busy} type="submit">{busy?'Building your neighborhood…':!world?'Loading Vienna…':started?'Drive again':'Drive'}<span aria-hidden="true">↗</span></button>
  </form>
  {started&&<button className="resume" onClick={drive}>Resume where I left off</button>}
  <details><summary>Photorealistic Google 3D scenery</summary><label htmlFor="key">Google Map Tiles API key</label><input id="key" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Optional restricted browser key" autoComplete="off"/><p>Enable Map Tiles API and billing. Availability varies by region. Without a key, buildings are reconstructed from real OpenStreetMap footprints.</p></details>
  <p className="instructions">WASD / arrows drive · Space brake · E enter / exit<br/>1 / 2 / 3 change car · R reset · Esc menu<br/>Touch: drag left side to steer; swipe up / down on right to drive.</p>
  <p className="status" aria-live="polite">{started?`${world?.name} · ${hud.onFoot?'On foot':VEHICLES[vehicle].name} · ${hud.speed} km/h · ${(hud.distance/1000).toFixed(2)} km`:'Real map geometry. Simulated traffic and pedestrians.'}</p>
  {error&&<p className="error" role="alert">{error}</p>}
  <small>AI-assisted development · <a href="https://github.com/itszyless/streetshift" target="_blank" rel="noreferrer">Source</a></small>
  </section></div>}
  <div className="attribution">{credits.includes('Google')&&<span className="google-brand">Google Maps</span>}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">{credits}</a></div>
 </main>;
}
