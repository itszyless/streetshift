import {useEffect,useRef,type RefObject} from 'react';
import {Engine,type Hud} from './engine';
import type {World} from './world';
import type {CarType} from './vehicles';
export function Game({world,engine,onHud,vehicle,googleKey,onCredits,onError}:{world:World;engine:RefObject<Engine|null>;onHud:(hud:Hud)=>void;vehicle:CarType;googleKey:string;onCredits:(s:string)=>void;onError:(s:string)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),initialVehicle=useRef(vehicle);
 useEffect(()=>{
  let game:Engine;try{game=new Engine(canvas.current!,world,initialVehicle.current,onHud,onCredits,onError,googleKey);engine.current=game;}catch{onError('3D graphics could not start. Enable hardware acceleration / WebGL in Chrome and reload.');return;}
  const keydown=(event:KeyboardEvent)=>{if(event.target instanceof HTMLElement&&event.target.closest('input,textarea,button,summary,a,select'))return;const key=event.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','e','r','escape','1','2','3'].includes(key))event.preventDefault();if(!event.repeat){if(key==='e')game.interact();if(key==='r')game.reset();if(key==='escape')game.togglePause();if(['1','2','3'].includes(key))game.choose((['coupe','sedan','rally'] as CarType[])[Number(key)-1]);}game.keys.add(key);};
  const keyup=(event:KeyboardEvent)=>game.keys.delete(event.key.toLowerCase());const blur=()=>{game.keys.clear();game.paused=true;};const visibility=()=>{if(document.hidden)blur();};
  const pointers=new Map<number,{x:number;y:number;left:boolean}>();
  const down=(e:PointerEvent)=>{if(e.pointerType==='mouse')return;canvas.current!.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,left:e.clientX<innerWidth/2});};
  const move=(e:PointerEvent)=>{const p=pointers.get(e.pointerId);if(!p)return;if(p.left){game.keys.delete('a');game.keys.delete('d');if(Math.abs(e.clientX-p.x)>12)game.keys.add(e.clientX<p.x?'a':'d');}else{game.keys.delete('w');game.keys.delete('s');if(Math.abs(e.clientY-p.y)>10)game.keys.add(e.clientY<p.y?'w':'s');}};
  const up=(e:PointerEvent)=>{const p=pointers.get(e.pointerId);if(p)for(const key of p.left?['a','d']:['w','s'])game.keys.delete(key);pointers.delete(e.pointerId);};
  const element=canvas.current!;element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);element.addEventListener('pointerup',up);element.addEventListener('pointercancel',up);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  return()=>{element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',up);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);game.destroy();engine.current=null;};
 },[world,engine,onHud,googleKey,onCredits,onError]);
 useEffect(()=>{initialVehicle.current=vehicle;engine.current?.choose(vehicle);},[vehicle,engine]);
 return <canvas ref={canvas} className="world" aria-label="3D real-world driving scene" tabIndex={-1}/>;
}
