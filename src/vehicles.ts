export const VEHICLES={
 coupe:{name:'Coupe',color:0xc1ec55,length:4.5,width:1.9,height:1.25,maxSpeed:42,acceleration:14,handling:1.8},
 sedan:{name:'Sedan',color:0xa9bbc2,length:4.9,width:1.9,height:1.55,maxSpeed:34,acceleration:10,handling:1.5},
 rally:{name:'Rally',color:0xd07b46,length:4.2,width:2,height:1.8,maxSpeed:30,acceleration:12,handling:2.1}
};
export type CarType=keyof typeof VEHICLES;
