import {blocked,closest,type World,type Point} from './world';
import {stepCar,type Vehicle} from './physics';
import {View3D} from './view3d';
import {VEHICLES,type CarType} from './vehicles';
export type Hud={speed:number;distance:number;onFoot:boolean;paused:boolean;message:string};
type Agent={road:number;t:number;direction:number;speed:number;ped:boolean};
export class Engine {
 world:World;car:Vehicle={x:0,y:0,angle:0,speed:0,color:'lime'};person:Point={x:0,y:0};onFoot=false;paused=true;keys=new Set<string>();
 private view:View3D;private raf=0;private last=0;private accumulator=0;private reportAt=0;private distance=0;private agents:Agent[]=[];private dead=false;private selected:CarType;
 constructor(canvas:HTMLCanvasElement,world:World,vehicle:CarType,private report:(hud:Hud)=>void,credits:(s:string)=>void,onError:(s:string)=>void,key?:string){
  this.world=world;this.selected=vehicle;this.view=new View3D(canvas,world,vehicle,credits,onError,key);this.reset();this.raf=requestAnimationFrame(this.frame);
 }
 start(){this.paused=false;this.keys.clear();this.last=0;}
 togglePause(){this.paused=!this.paused;this.keys.clear();}
 choose(type:CarType){this.selected=type;this.car={...this.car,...VEHICLES[type],color:VEHICLES[type].name};this.view.setCar(type);}
 reset(){
  const usable=this.world.roads.filter(r=>Math.max(Math.abs(r.a.x),Math.abs(r.a.y),Math.abs(r.b.x),Math.abs(r.b.y))<this.world.radius);
  const ordered=(usable.length?usable:this.world.roads).map(r=>({r,p:closest({x:0,y:0},r)})).sort((a,b)=>Math.hypot(a.p.x,a.p.y)-Math.hypot(b.p.x,b.p.y));
  const spawn=ordered.find(v=>!blocked(v.p,this.world,3))||ordered[0];
  this.car={...spawn.p,...VEHICLES[this.selected],color:VEHICLES[this.selected].name,angle:Math.atan2(spawn.r.b.x-spawn.r.a.x,-(spawn.r.b.y-spawn.r.a.y)),speed:0};
  this.person={...this.car};this.onFoot=false;this.distance=0;this.accumulator=0;this.view.snap(this.car,this.car.angle);
  const localRoads=this.world.roads.map((r,i)=>({i,d:Math.hypot(closest(this.car,r).x-this.car.x,closest(this.car,r).y-this.car.y)})).sort((a,b)=>a.d-b.d).slice(0,70);
  this.agents=Array.from({length:48},(_,i)=>({road:localRoads[i%localRoads.length].i,t:(i*.618)%1,direction:i%2?1:-1,speed:i%3===0?1.2:5+i%6,ped:i%3===0}));
 }
 interact(){
  if(this.paused)return;
  if(!this.onFoot){if(Math.abs(this.car.speed)>2)return;const p={x:this.car.x+Math.cos(this.car.angle)*3,y:this.car.y+Math.sin(this.car.angle)*3};if(blocked(p,this.world,.5))return;this.person=p;this.car.speed=0;this.onFoot=true;}
  else if(Math.hypot(this.person.x-this.car.x,this.person.y-this.car.y)<9)this.onFoot=false;
 }
 private position(){return this.onFoot?this.person:this.car;}
 private agentPosition(a:Agent){const r=this.world.roads[a.road],dx=r.b.x-r.a.x,dy=r.b.y-r.a.y,n=Math.hypot(dx,dy)||1,lane=(a.ped?r.width/2+1:r.width/4)*a.direction;return {x:r.a.x+dx*a.t-dy/n*lane,y:r.a.y+dy*a.t+dx/n*lane};}
 private update(dt:number){
  const before={...this.position()},throttle=Number(this.keys.has('w')||this.keys.has('arrowup'))-Number(this.keys.has('s')||this.keys.has('arrowdown')),steer=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft'));
  if(this.onFoot){const angle=this.car.angle,forward=throttle*3.4*dt,side=steer*3.4*dt,n=Math.hypot(throttle,steer)||1;const p={x:this.person.x+(Math.sin(angle)*forward+Math.cos(angle)*side)/n,y:this.person.y+(-Math.cos(angle)*forward+Math.sin(angle)*side)/n};if(!blocked(p,this.world,.6))this.person=p;}
  else stepCar(this.car,{throttle,steer,brake:this.keys.has(' ')},dt,this.world);
  const active=this.position();this.distance+=Math.hypot(active.x-before.x,active.y-before.y);
  for(const a of this.agents){const r=this.world.roads[a.road],p=this.agentPosition(a),dist=Math.hypot(active.x-p.x,active.y-p.y);if(!a.ped&&!this.onFoot&&dist<4)this.car.speed*=Math.exp(-6*dt);if(dist>7){a.t+=dt*a.speed*a.direction/Math.max(1,Math.hypot(r.b.x-r.a.x,r.b.y-r.a.y));if(a.t>1||a.t<0){a.direction*=-1;a.t=Math.min(1,Math.max(0,a.t));}}}
 }
 private frame=(now:number)=>{
  if(this.dead)return;const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;
  if(!this.paused){this.accumulator+=dt;while(this.accumulator>=1/120){this.update(1/120);this.accumulator-=1/120;}}
  this.view.render(this.car,this.person,this.onFoot,this.agents.map(a=>{const r=this.world.roads[a.road];return {position:this.agentPosition(a),angle:Math.atan2((r.b.x-r.a.x)*a.direction,-(r.b.y-r.a.y)*a.direction),ped:a.ped};}),dt,now);
  if(now-this.reportAt>120){this.reportAt=now;this.report({speed:Math.round(Math.abs(this.car.speed)*3.6),distance:this.distance,onFoot:this.onFoot,paused:this.paused,message:''});}this.raf=requestAnimationFrame(this.frame);
 };
 destroy(){this.dead=true;cancelAnimationFrame(this.raf);this.view.destroy();this.keys.clear();}
}
