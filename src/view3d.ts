import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {blocked,inside,type World,type Point} from './world';
import {VEHICLES,type CarType} from './vehicles';
import type {Vehicle} from './physics';
export type RenderAgent={position:Point;angle:number;ped:boolean};
export class View3D {
 renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(62,1,.2,2000);
 private district=new THREE.Group();private car=new THREE.Group();private pedestrian=new THREE.Group();private npcs:THREE.Group[]=[];private observer:ResizeObserver;private wheels:THREE.Object3D[]=[];
 private target=new THREE.Vector3();private look=new THREE.Vector3();private groundHeight=0;private tileGround=0;private lastGroundCheck=0;private tiles:import('3d-tiles-renderer/three').TilesRenderer|null=null;private tileContainer=new THREE.Group();private dead=false;private lastAttribution=0;
 constructor(private canvas:HTMLCanvasElement,private world:World,vehicle:CarType,private credits:(s:string)=>void,private onError:(s:string)=>void,key?:string){
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.scene.background=new THREE.Color('#cbdde4');this.scene.fog=new THREE.Fog('#cbdde4',180,900);
  this.scene.add(new THREE.HemisphereLight(0xe7f4ff,0x8a866e,2.7));const sun=new THREE.DirectionalLight(0xffe2ba,3.5);sun.position.set(-100,150,80);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;sun.shadow.camera.top=100;sun.shadow.camera.bottom=-100;sun.shadow.camera.far=450;sun.shadow.bias=-.0004;this.scene.add(sun);this.scene.add(sun.target);
  this.scene.add(this.district);this.makeDistrict();this.setCar(vehicle);this.pedestrian=this.makePerson();this.scene.add(this.pedestrian);this.pedestrian.visible=false;
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
  this.camera.position.set(0,6,12);this.credits('© OpenStreetMap contributors · ODbL');
  if(key)void this.addGoogle(key);
 }
 private material(color:THREE.ColorRepresentation,roughness=.75){return new THREE.MeshStandardMaterial({color,roughness});}
 private box(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material){const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.07,w/4,h/4,d/4)),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 private makeCar(type:CarType,npc=false){
  const v=VEHICLES[type],g=new THREE.Group(),paint=this.material(v.color,.28),glass=new THREE.MeshStandardMaterial({color:0x243b46,metalness:.45,roughness:.12}),rubber=this.material(0x171b1c),metal=this.material(0xa1aab0,.22);
  this.box(g,v.width,.56,v.length,0,.65,0,paint);const upper=this.box(g,v.width*.82,v.height-.45,v.length*.48,0,v.height*.7,.12,paint);upper.geometry=new THREE.BoxGeometry(v.width*.82,v.height-.45,v.length*.48);
  this.box(g,v.width*.74,.04,v.length*.36,0,v.height+.03,.1,glass);
  const front=this.box(g,v.width*.74,.4,.05,0,v.height*.83,-v.length*.24,glass);front.rotation.x=-.32;
  const back=this.box(g,v.width*.74,.34,.05,0,v.height*.84,v.length*.26,glass);back.rotation.x=.25;
  for(const side of [-1,1]){this.box(g,.035,.32,v.length*.38,side*v.width*.415,v.height*.86,.1,glass);this.box(g,.18,.09,.4,side*(v.width/2+.06),1.02,-.6,paint);
   for(const end of [-1,1]){const tire=new THREE.Mesh(new THREE.CylinderGeometry(.37,.37,.23,14),rubber);tire.rotation.z=Math.PI/2;tire.position.set(side*v.width/2,.4,end*v.length*.31);g.add(tire);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.24,12),metal);hub.rotation.z=Math.PI/2;hub.position.copy(tire.position);g.add(hub);if(!npc)this.wheels.push(tire,hub);}
   this.box(g,.48,.13,.055,side*.58,.73,-v.length/2-.03,new THREE.MeshStandardMaterial({color:0xfff4c5,emissive:0xfff4c5,emissiveIntensity:.7}));
   this.box(g,.5,.12,.055,side*.58,.75,v.length/2+.03,new THREE.MeshStandardMaterial({color:0xef4d36,emissive:0xff2715,emissiveIntensity:.65}));
  }
  this.box(g,v.width*.8,.12,.08,0,.39,-v.length/2-.05,rubber);this.box(g,v.width*.8,.12,.08,0,.39,v.length/2+.05,rubber);this.box(g,.55,.14,.055,0,.6,v.length/2+.08,this.material(0xe7e7dd));
  if(type==='rally'){this.box(g,1.3,.07,1.7,0,v.height+.15,0,rubber);this.box(g,1.8,.12,.24,0,v.height+.35,1.15,paint);}
  if(npc)g.traverse(o=>{o.castShadow=false;});return g;
 }
 setCar(type:CarType){if(this.car.parent){this.scene.remove(this.car);this.disposeObject(this.car);}this.wheels=[];this.car=this.makeCar(type);this.scene.add(this.car);}
 private makePerson(){const g=new THREE.Group(),shirt=this.material(0x586d7d),pants=this.material(0x2c3940),skin=this.material(0xb98f72);this.box(g,.48,.65,.27,0,1.12,0,shirt);const head=new THREE.Mesh(new THREE.SphereGeometry(.19,8,8),skin);head.position.y=1.65;g.add(head);for(const side of [-1,1]){this.box(g,.16,.65,.17,side*.14,.47,0,pants);this.box(g,.13,.55,.16,side*.32,1.07,0,shirt);}return g;}
 private makeDistrict(){
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(2600,2600),this.material('#a5a89b'));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;this.district.add(ground);
  const roadGeoms:THREE.BufferGeometry[]=[],walkGeoms:THREE.BufferGeometry[]=[],lineGeoms:THREE.BufferGeometry[]=[];
  for(const r of this.world.roads){const dx=r.b.x-r.a.x,dz=r.b.y-r.a.y,len=Math.hypot(dx,dz);const angle=Math.atan2(dx,dz),cx=(r.a.x+r.b.x)/2,cz=(r.a.y+r.b.y)/2;
   for(const [width,height,list] of [[r.width+4,.08,walkGeoms],[r.width,.1,roadGeoms]] as const){const geo=new THREE.BoxGeometry(width,height,len+1);geo.rotateY(angle);geo.translate(cx,height/2,cz);list.push(geo);}
   if(r.width>=7)for(let d=4;d<len-3;d+=9){const geo=new THREE.BoxGeometry(.1,.02,3);geo.rotateY(angle);geo.translate(r.a.x+dx*d/len,.115,r.a.y+dz*d/len);lineGeoms.push(geo);}
  }
  const batch=(geometries:THREE.BufferGeometry[],color:THREE.ColorRepresentation,shadows=false)=>{if(!geometries.length)return;const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)return;const m=new THREE.Mesh(merged,this.material(color));m.receiveShadow=true;m.castShadow=shadows;this.district.add(m);return m;};
  batch(walkGeoms,'#b7b7aa');batch(roadGeoms,'#3b4142');batch(lineGeoms,'#c5c4af');
  const builds:THREE.BufferGeometry[]=[],windows:THREE.Matrix4[]=[],dummy=new THREE.Object3D();
  this.world.buildings.forEach((b,index)=>{if(b.points.length<3)return;const shape=new THREE.Shape(b.points.map(p=>new THREE.Vector2(p.x,-p.y)));const height=b.height||12+(index%5)*3;const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});geo.rotateX(-Math.PI/2);
   const colors=new Float32Array(geo.attributes.position.count*3),color=new THREE.Color(['#d0c6b2','#bdc1b5','#d7cfc1','#c5b29b','#b9b3a8'][index%5]);for(let i=0;i<geo.attributes.position.count;i++){colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;}geo.setAttribute('color',new THREE.BufferAttribute(colors,3));builds.push(geo);
   for(let k=0;k<b.points.length;k++){const a=b.points[k],z=b.points[(k+1)%b.points.length],dx=z.x-a.x,dz=z.y-a.y,len=Math.hypot(dx,dz);if(len<3||len>250)continue;const normal={x:dz/len,z:-dx/len};const mx=(a.x+z.x)/2,mz=(a.y+z.y)/2;if(inside({x:mx+normal.x,y:mz+normal.z},b.points)) {normal.x*=-1;normal.z*=-1;}
    for(let y=2.7;y<Math.min(height-1,27);y+=3.2)for(let d=2;d<len-1;d+=3.2){if(windows.length>100000)break;dummy.position.set(a.x+dx*d/len+normal.x*.06,y,a.y+dz*d/len+normal.z*.06);dummy.rotation.set(0,Math.atan2(normal.x,normal.z),0);dummy.updateMatrix();windows.push(dummy.matrix.clone());}
   }
  });
  if(builds.length){const merged=mergeGeometries(builds);builds.forEach(g=>g.dispose());const buildings=new THREE.Mesh(merged!,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}));buildings.castShadow=true;buildings.receiveShadow=true;buildings.name='buildings';this.district.add(buildings);}
  const win=new THREE.InstancedMesh(new THREE.BoxGeometry(.95,1.55,.1),this.material('#536466',.35),windows.length);windows.forEach((m,i)=>win.setMatrixAt(i,m));this.district.add(win);
  const trees:Point[]=[];for(const r of this.world.roads){const dx=r.b.x-r.a.x,dy=r.b.y-r.a.y,len=Math.hypot(dx,dy);for(let d=12;d<len-5;d+=35){const p={x:r.a.x+dx*d/len-dy/len*(r.width/2+1.4),y:r.a.y+dy*d/len+dx/len*(r.width/2+1.4)};if(!blocked(p,this.world,2)&&trees.length<250)trees.push(p);}}
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.22,3,6),this.material('#786552'),trees.length),leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.2,1),this.material('#6c8251'),trees.length);trees.forEach((p,i)=>{dummy.position.set(p.x,1.5,p.y);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=4.2;dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix)});leaves.castShadow=true;this.district.add(trunks,leaves);
 }
 private async addGoogle(key:string){
  try{const [{TilesRenderer},{GoogleCloudAuthPlugin},{ReorientationPlugin,GLTFExtensionsPlugin}]=await Promise.all([import('3d-tiles-renderer/three'),import('3d-tiles-renderer/core/plugins'),import('3d-tiles-renderer/three/plugins')]);if(this.dead)return;
   const tiles=new TilesRenderer('https://tile.googleapis.com/v1/3dtiles/root.json');this.tiles=tiles;tiles.registerPlugin(new GoogleCloudAuthPlugin({apiToken:key}));tiles.registerPlugin(new ReorientationPlugin({lat:this.world.origin.lat*Math.PI/180,lon:this.world.origin.lng*Math.PI/180,height:0}));
   const draco=new DRACOLoader();draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);tiles.registerPlugin(new GLTFExtensionsPlugin({dracoLoader:draco,autoDispose:true}));
   tiles.errorTarget=8;tiles.setCamera(this.camera);this.tileContainer.rotation.y=Math.PI;this.tileContainer.add(tiles.group);this.scene.add(this.tileContainer);
   tiles.addEventListener('load-error',()=>this.onError('Google 3D scenery could not load. Check your Map Tiles API key, billing and coverage. Reconstructed streets remain available.'));
  }catch{this.onError('Google 3D scenery could not initialize. Reconstructed streets remain available.');}
 }
 private resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 render(car:Vehicle,person:Point,onFoot:boolean,agents:RenderAgent[],dt:number,now:number){
  if(this.tiles){this.tiles.setResolutionFromRenderer(this.camera,this.renderer);this.tiles.update();this.tileContainer.updateMatrixWorld(true);
   if(now-this.lastGroundCheck>300){this.lastGroundCheck=now;const ray=new THREE.Raycaster(new THREE.Vector3(car.x,4000,car.y),new THREE.Vector3(0,-1,0));const hits=ray.intersectObject(this.tileContainer,true);if(hits.length){this.tileGround=hits[0].point.y;this.district.visible=false;}else this.district.visible=true;}
   if(now-this.lastAttribution>1000){this.lastAttribution=now;const credits=this.tiles.getAttributions().filter(a=>a.type==='string').map(a=>String(a.value)).join(' · ');this.credits(credits?`Google Maps · ${credits} · © OpenStreetMap contributors`:'Google Maps · © OpenStreetMap contributors');}
  }
  this.groundHeight=THREE.MathUtils.damp(this.groundHeight,this.tileGround,10,dt||.016);this.car.position.set(car.x,this.groundHeight+.08,car.y);this.car.rotation.y=-car.angle;this.wheels.forEach(w=>w.rotation.x+=car.speed*dt/.37);
  this.pedestrian.visible=onFoot;this.pedestrian.position.set(person.x,this.groundHeight,person.y);
  agents.forEach((a,i)=>{if(!this.npcs[i]){this.npcs[i]=a.ped?this.makePerson():this.makeCar(i%2?'sedan':'rally',true);this.scene.add(this.npcs[i]);}const mesh=this.npcs[i];mesh.position.set(a.position.x,this.groundHeight+.08,a.position.y);mesh.rotation.y=-a.angle;mesh.visible=mesh.position.distanceTo(this.camera.position)>3;if(a.ped)mesh.children.forEach((child,j)=>{if(j>1)child.rotation.x=Math.sin(now*.005+i)*(j%2?.2:-.2);});});
  const p=onFoot?person:car,angle=car.angle,forward=new THREE.Vector3(Math.sin(angle),0,-Math.cos(angle));const distance=onFoot?7:11+Math.abs(car.speed)*.07;
  this.target.set(p.x-forward.x*distance,this.groundHeight+(onFoot?4:5.4),p.y-forward.z*distance);
  if(this.district.visible){const buildings=this.district.getObjectByName('buildings');if(buildings){const origin=new THREE.Vector3(p.x,this.groundHeight+2,p.y),direction=this.target.clone().sub(origin),length=direction.length();const ray=new THREE.Raycaster(origin,direction.normalize(),.1,length);const hits=ray.intersectObject(buildings);if(hits.length)this.target.copy(origin).addScaledVector(direction,Math.max(1,hits[0].distance-.8));}}
  this.camera.position.lerp(this.target,1-Math.exp(-5*(dt||.016)));this.look.set(p.x+forward.x*7,this.groundHeight+1.5,p.y+forward.z*7);this.camera.lookAt(this.look);
  const sun=this.scene.children.find(o=>o instanceof THREE.DirectionalLight) as THREE.DirectionalLight;sun.position.set(p.x-80,this.groundHeight+120,p.y+70);sun.target.position.set(p.x,this.groundHeight,p.y);sun.target.updateMatrixWorld();this.renderer.render(this.scene,this.camera);
 }
 snap(p:Point,angle:number){this.camera.position.set(p.x-Math.sin(angle)*11,6,p.y+Math.cos(angle)*11);}
 private disposeObject(object:THREE.Object3D){object.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 destroy(){this.dead=true;this.observer.disconnect();this.tiles?.dispose();this.disposeObject(this.scene);this.renderer.dispose();}
}


