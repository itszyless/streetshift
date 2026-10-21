import {blocked,clamp,type World,type Point} from './world.ts';
export type Vehicle=Point&{angle:number;speed:number;color:string;maxSpeed?:number;acceleration?:number;handling?:number};
export type Controls={throttle:number;steer:number;brake:boolean};
export function stepCar(car:Vehicle,input:Controls,dt:number,world:World):number {
 car.speed+=input.throttle*(input.throttle*car.speed<0?22:(car.acceleration||13))*dt;
 car.speed*=Math.exp(-(input.brake?4.5:input.throttle===0?0.8:0.12)*dt);
 car.speed=clamp(car.speed,-10,car.maxSpeed||40);
 car.angle+=input.steer*clamp(car.speed/10,-1,1)*(car.handling||1.8)*dt*(input.brake?1.4:1);
 const next={x:car.x+Math.sin(car.angle)*car.speed*dt,y:car.y-Math.cos(car.angle)*car.speed*dt};
 if(blocked(next,world,2.5)){const impact=Math.abs(car.speed);car.speed*=-0.15;return impact;}
 car.x=next.x;car.y=next.y;return 0;
}
