/* Urban Rider — WebGL/Three.js real. O motor Three.js está em vendor/. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const THREE=window.THREE;
  if(!THREE){return fallback('Biblioteca 3D indisponível');}
  let renderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}
  catch(error){return fallback('WebGL indisponível: '+error.message);}
  function fallback(reason){console.warn(reason);window.__startFallback(reason);}
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x9dccf0);scene.fog=new THREE.FogExp2(0x9dccf0,.00022);
  const camera=new THREE.PerspectiveCamera(67,innerWidth/innerHeight,.1,6500);
  renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.23;$('scene').appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xf6f7ff,0x718b75,1.4));const sun=new THREE.DirectionalLight(0xfff0d1,2.7);sun.position.set(-1000,1400,500);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-1100;sun.shadow.camera.right=1100;sun.shadow.camera.top=1100;sun.shadow.camera.bottom=-1100;scene.add(sun);scene.add(sun.target);
  const mat=(color,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness});const asphalt=mat(0x4a5158),pavement=mat(0xd0cbc2),grass=mat(0x8bb477),white=mat(0xf4f6f4),yellow=mat(0xe9d066),water=mat(0x218ab4,.25),dark=mat(0x1a2630),glass=mat(0x80aabb,.28),scootMat=mat(0x37dbc2,.32),metal=mat(0x97a7ad,.3);
  // Texturas procedurais de alta frequência para substituir superfícies chapadas.
  function surfaceTexture(kind,repeatX,repeatY){
    const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
    const base={asphalt:'#696d70',grass:'#8cae7a',concrete:'#d2cfc8',sand:'#dfc998'}[kind];g.fillStyle=base;g.fillRect(0,0,256,256);
    for(let i=0;i<2300;i++){const x=(i*97.31)%256,y=(i*73.19)%256,v=(i*61)%30;g.fillStyle=i%2?`rgba(10,18,23,${.025+v/900})`:`rgba(255,255,255,${.015+v/1100})`;g.fillRect(x,y,kind==='grass'?2:1,kind==='grass'?5:2);}
    if(kind==='concrete'){g.strokeStyle='#8e979222';g.lineWidth=2;for(let k=0;k<=256;k+=64){g.beginPath();g.moveTo(k,0);g.lineTo(k,256);g.moveTo(0,k);g.lineTo(256,k);g.stroke();}}
    if(kind==='grass'){g.strokeStyle='#357d3b55';for(let i=0;i<90;i++){const x=(i*103.17)%256,y=(i*79.3)%256;g.beginPath();g.moveTo(x,y);g.lineTo(x+3,y-7);g.stroke();}}
    const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeatX,repeatY);texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return texture;
  }
  asphalt.map=surfaceTexture('asphalt',12,75);grass.map=surfaceTexture('grass',27,27);pavement.map=surfaceTexture('concrete',8,48);
  function facadeTexture(tint){const c=document.createElement('canvas');c.width=256;c.height=512;const g=c.getContext('2d');g.fillStyle=tint;g.fillRect(0,0,256,512);for(let y=22;y<500;y+=52)for(let x=16;x<256;x+=48){g.fillStyle=(x+y)%3===0?'#b8e0eb':'#4b697b';g.fillRect(x,y,29,33);g.fillStyle='#e1ecf1b0';g.fillRect(x+2,y+2,3,29);g.fillStyle='#283c48';g.fillRect(x+14,y,2,33);g.fillStyle='#ffffff35';g.fillRect(x,y+31,29,2);}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;}
  const facades=[facadeTexture('#a5b5bd'),facadeTexture('#c7c6b8'),facadeTexture('#9fa7b6'),facadeTexture('#c0b1a5')];
  const tallFacades=facades.map(t=>{const c=t.clone();c.repeat.set(2,5);c.needsUpdate=true;return c;});
  const midFacades=facades.map(t=>{const c=t.clone();c.repeat.set(1.5,3);c.needsUpdate=true;return c;});
  const cubeGeo=new THREE.BoxGeometry(1,1,1),cylGeo=new THREE.CylinderGeometry(1,1,1,12);
  function box(x,y,z,w,h,d,material,parent=scene,shadow=true){const mesh=new THREE.Mesh(cubeGeo,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cyl(x,y,z,r,h,material,parent=scene){const mesh=new THREE.Mesh(cylGeo,material);mesh.position.set(x,y,z);mesh.scale.set(r,h,r);mesh.castShadow=true;parent.add(mesh);return mesh;}
  const ground=box(0,-2,0,4500,2,4500,grass,scene,false);
  // Quatro setores contínuos: NO centro, NE bairros, SO orla e SE rural.
  const edge=2100,mainRoads=[-1800,-1200,-600,0,600,1200,1800],roads=[];
  for(const p of mainRoads){const width=p===0?95:72;roads.push({axis:'x',p,width},{axis:'z',p,width});box(p,.05,0,width+20,.16,4400,pavement,scene,false);box(0,.06,p,4400,.16,width+20,pavement,scene,false);box(p,.16,0,width,.2,4400,asphalt,scene,false);box(0,.17,p,4400,.2,width,asphalt,scene,false);for(let t=-2050;t<=2050;t+=80){box(p,.29,t,1,.03,30,yellow,scene,false);box(t,.3,p,30,.03,1,yellow,scene,false);}}
  // Faixa da orla e oceano na metade sudoeste.
  box(-1600,-1.0,1490,1120,1,1400,water,scene,false);box(-1010,-.9,1450,65,1,1300,mat(0xe2d5aa),scene,false);
  // Serra e morros na região sudeste.
  function hill(x,z,rx,h,color){const mesh=new THREE.Mesh(new THREE.ConeGeometry(rx,h,9),mat(color));mesh.position.set(x,h/2-3,z);scene.add(mesh);}
  for(let i=0;i<18;i++){const x=500+(i*173)%1500,z=500+(i*283)%1500;hill(x,z,80+(i%4)*23,80+(i%5)*35,0x638661);}
  function random(a,b,c=0){const q=Math.sin(a*13.16+b*79.31+c*41.7)*43758.5;return q-Math.floor(q);}
  function tree(x,z,scale=1){cyl(x,9*scale,z,2*scale,18*scale,mat(0x765333));const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(12*scale,0),mat(random(x,z)>.5?0x398754:0x2d7047));crown.position.set(x,25*scale,z);crown.castShadow=true;scene.add(crown);}
  const buildingColors=[0xa3b8c4,0xc9d3d3,0x9fa3ab,0xc2b1a2,0xe2d6bf,0xb5c9c5],roof=mat(0x566875),windowMat=mat(0x79a9bd,.35);
  for(let x=-1950;x<=1950;x+=150)for(let z=-1950;z<=1950;z+=150){
    if(mainRoads.some(r=>Math.abs(x-r)<100)||mainRoads.some(r=>Math.abs(z-r)<100))continue;
    if(x< -950&&z>700)continue;
    const r=random(x,z),center=x<0&&z<0,suburb=x>=0&&z<0,coast=x<0&&z>=0;
    if(!center&&r<.35){tree(x,z,.9);continue;}
    const height=center?75+r*260:suburb?20+r*40:coast?24+r*70:13+r*28;
    const width=center?70:suburb?72:coast?85:65;
    const material=mat(buildingColors[Math.floor(r*buildingColors.length)],.75);
    if(center||coast){const k=Math.floor(r*facades.length);material.map=center&&height>180?tallFacades[k]:midFacades[k];material.emissive=new THREE.Color(0x10151a);material.emissiveIntensity=.12;}
    box(x,height/2,z,width,height,width*.85,material);
    box(x,height+1,z,width+5,3,width*.85+5,roof);
    if(center||coast){box(x,height-8,z+width*.425+.3,width-8,2,.6,roof,scene,false);}
    if(!center)for(let k=0;k<2;k++)tree(x+(k?54:-54),z+45,.65);
  }
  // Skyline de referência: arquitetura original com torres claras, vidro escuro,
  // prédios cilíndricos e embasamentos comerciais, sem copiar edificações de GTA.
  const facadeWhite=mat(0xe4e8e5,.38),facadeBlack=mat(0x263745,.24),facadeBlue=mat(0x83bacb,.2),trim=mat(0xaab8bf,.55);
  facadeWhite.map=tallFacades[1];facadeBlack.map=tallFacades[2];facadeBlue.map=tallFacades[0];
  const towers=[
    {x:-870,z:-1360,w:105,d:100,h:510,material:facadeWhite,shape:'round'},
    {x:-1450,z:-900,w:105,d:115,h:430,material:facadeBlack},
    {x:-1330,z:-1450,w:105,d:110,h:370,material:facadeBlue},
    {x:-880,z:-1650,w:95,d:95,h:385,material:facadeBlack},
    {x:-1550,z:-1520,w:130,d:115,h:295,material:facadeBlue},
    {x:-500,z:-1250,w:105,d:115,h:340,material:facadeWhite}
  ];
  for(const tower of towers){
    const {x,z,w,d,h,material}=tower;
    if(tower.shape==='round'){
      const cylinder=new THREE.Mesh(new THREE.CylinderGeometry(w*.49,w*.51,h,32,1),material);cylinder.position.set(x,h/2,z);cylinder.castShadow=true;scene.add(cylinder);
      for(let y=25;y<h;y+=21){const band=new THREE.Mesh(new THREE.CylinderGeometry(w*.505,w*.505,3.2,32,1,true),trim);band.position.set(x,y,z);scene.add(band);}
    }else{
      box(x,h/2,z,w,h,d,material);
      for(let y=27;y<h;y+=26){box(x,y,z+d/2+.65,w+2,2.7,1.2,trim,scene,false);box(x,y,z-d/2-.65,w+2,2.7,1.2,trim,scene,false);}
    }
    box(x,h+2,z,w+8,4,d+8,trim,scene,false);
    box(x,12,z+d/2+20,w+29,24,34,mat(0x9da8a7),scene,false);
  }
  // Praça e prefeitura no Centro.
  box(-900,.4,-900,270,1,250,pavement);box(-900,32,-920,170,64,105,mat(0xe4d7c4));box(-900,67,-920,190,7,120,mat(0x9aaeb6));for(let i=-2;i<=2;i++)cyl(-900+i*28,26,-850,5,52,white);
  function roundabout(x,z,r){const outer=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.6,48),asphalt);outer.position.set(x,.8,z);scene.add(outer);const inner=new THREE.Mesh(new THREE.CylinderGeometry(r*.45,r*.45,1,48),grass);inner.position.set(x,1.5,z);scene.add(inner);tree(x,z,1.3);}
  roundabout(0,0,100);roundabout(1200,-600,75);roundabout(-1200,600,75);
  // Faixas, marcações de retenção, postes de luz e mobiliário de rua.
  const poleMat=mat(0x5e686c),lampGlow=new THREE.MeshBasicMaterial({color:0xffecb8});
  const streetLamps=[];
  for(const p of mainRoads)for(let t=-1950;t<=1950;t+=300){
    if(Math.abs(t-p)<80)continue;
    cyl(p+49,24,t,1.15,48,poleMat);box(p+42,47,t,15,2.3,2,poleMat);const light=box(p+35,44,t,6,1.8,4,lampGlow,scene,false);streetLamps.push(light);
  }
  for(const x of [-1200,-600,0,600,1200])for(const z of [-1200,-600,0,600,1200]){
    for(let k=0;k<6;k++){box(x-36+k*14,.36,z+57,8,.09,17,white,scene,false);box(x+57,.36,z-36+k*14,17,.09,8,white,scene,false);}
    box(x,.38,z+76,68,.12,2,white,scene,false);
  }
  // Elementos de escala humana nos cruzamentos do Centro.
  const planter=mat(0x596568),shopFront=mat(0x445a65,.25),awning=mat(0xa94e43);
  for(const x of [-1800,-1200,-600])for(const z of [-1800,-1200,-600]){
    for(const side of [-1,1]){
      const px=x+side*110,pz=z+108;
      box(px,2,pz,30,4,20,planter,scene,false);tree(px,pz,.75);
      box(x+side*160,13,z+120,68,25,35,shopFront,scene,false);
      box(x+side*160,26,z+140,76,3,18,awning,scene,false);
    }
    // faixas de retenção e linha de bordo em cruzamentos grandes.
    box(x,.42,z+101,90,.12,2.5,white,scene,false);
  }
  // Palms na orla para silhuetas urbanas diferenciadas.
  for(let z=650;z<1900;z+=170){const x=-960;const trunk=cyl(x,23,z,3.5,46,mat(0x8a714e));trunk.rotation.z=.12;const leaves=new THREE.Mesh(new THREE.SphereGeometry(19,9,6),mat(0x2b8059));leaves.scale.y=.25;leaves.position.set(x-5,49,z);scene.add(leaves);}
  // Nuvens volumétricas estilizadas no céu e silhueta de montanhas distantes.
  const cloudMat=new THREE.MeshBasicMaterial({color:0xf5fbff,transparent:true,opacity:.76,depthWrite:false});const clouds=[];
  for(let i=0;i<28;i++){const cloud=new THREE.Group();const x=-2100+(i*479)%4200,z=-2100+(i*653)%4200;cloud.position.set(x,550+(i%5)*34,z);for(let c=0;c<3;c++){const part=new THREE.Mesh(new THREE.SphereGeometry(48+(i+c)%3*10,10,7),cloudMat);part.scale.set(1.25,.35,.55);part.position.x=c*42;cloud.add(part);}scene.add(cloud);clouds.push(cloud);}
  // Sinalização vertical e sinais semafóricos.
  const lights=[];
  for(const x of [-1200,-600,600,1200])for(const z of [-1200,-600,600,1200]){
    cyl(x+49,15,z+49,1.4,30,dark);box(x+49,32,z+49,8,18,6,dark);
    const bulb=[];for(let i=0;i<3;i++){const mesh=new THREE.Mesh(new THREE.SphereGeometry(2.3,10,8),new THREE.MeshBasicMaterial({color:[0x5f1515,0x665522,0x1c5734][i]}));mesh.position.set(x+49,37-i*5,z+53);scene.add(mesh);bulb.push(mesh);}lights.push({x,z,bulb});
  }
  // Scooter modelada com elementos geométricos, capacete e dois retrovisores.
  const scooter=new THREE.Group();scene.add(scooter);const tireMat=mat(0x14191e);
  function wheel(z){const tire=new THREE.Mesh(new THREE.TorusGeometry(8.5,3,10,22),tireMat);tire.rotation.y=Math.PI/2;tire.position.set(0,10,z);tire.castShadow=true;scooter.add(tire);const hub=new THREE.Mesh(new THREE.CylinderGeometry(5,5,2,16),metal);hub.rotation.z=Math.PI/2;hub.position.set(0,10,z);scooter.add(hub);}
  wheel(-20);wheel(21);box(0,15,0,16,7,38,scootMat,scooter);box(0,20,9,17,6,24,dark,scooter);box(0,26,-18,15,25,9,scootMat,scooter);box(0,39,-17,38,3,3,dark,scooter);box(0,34,8,20,22,15,mat(0x315778),scooter);
  const helmetMesh=new THREE.Mesh(new THREE.SphereGeometry(10,16,12),white);helmetMesh.position.set(0,53,7);scooter.add(helmetMesh);
  const blink=[];for(const side of [-1,1]){box(side*22,47,-17,2,19,2,metal,scooter);box(side*24,56,-17,14,8,4,dark,scooter);const signal=box(side*19,36,-19,6,3,3,mat(0x85642d),scooter);blink.push(signal);}
  const headlight=box(0,29,-24,9,7,1.5,new THREE.MeshBasicMaterial({color:0xfff5ce}),scooter);const brakeMat=new THREE.MeshBasicMaterial({color:0xa72b25});box(0,17,25,11,5,1.5,brakeMat,scooter);
  const beamLight=new THREE.SpotLight(0xfff3cd,2.1,230,Math.PI/7,.38,1);beamLight.position.set(0,32,-22);beamLight.target.position.set(0,8,-150);scooter.add(beamLight);scooter.add(beamLight.target);
  // Retrovisores render-to-texture: visão real da cena em câmeras traseiras.
  const mirrorTargets=[],mirrorCameras=[];
  for(const side of [-1,1]){const target=new THREE.WebGLRenderTarget(192,108);mirrorTargets.push(target);mirrorCameras.push(new THREE.PerspectiveCamera(65,16/9,.1,1000));const face=box(side*24,56,-20,11,6,.3,new THREE.MeshBasicMaterial({map:target.texture,side:THREE.DoubleSide}),scooter);face.rotation.y=side*.1;}
  const carColors=[0xe7655b,0x4e78bf,0xe4bd48,0xe7e8e5,0x667e8d,0x49a58f];const cars=[];
  for(let i=0;i<54;i++){
    const car=new THREE.Group();scene.add(car);const color=mat(carColors[i%carColors.length]);const length=i%13===0?65:40;box(0,11,0,25,14,length,color,car);box(0,21,-3,20,10,length*.5,glass,car);
    for(const a of [-10,10])for(const b of [-length*.33,length*.33]){const tire=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.5,4,12),tireMat);tire.rotation.z=Math.PI/2;tire.position.set(a,6,b);car.add(tire);}
    const lane=mainRoads[i%mainRoads.length],axis=i%2,dir=i%4<2?1:-1;
    cars.push({car,lane,axis,dir,pos:-1950+(i*233)%3900,v:32+(i*13)%55});
  }
  const missions=[{x:-900,z:-780,label:'Entrega na Prefeitura'},{x:900,z:-600,label:'Entrega nos Bairros'},{x:-1200,z:1200,label:'Encomenda na Orla'},{x:1200,z:1200,label:'Entrega nas Serras'}];let missionIndex=0,xp=0,credits=0,fines=0,helm=true;
  const marker=new THREE.Group();scene.add(marker);const ring=new THREE.Mesh(new THREE.TorusGeometry(22,3,8,24),new THREE.MeshBasicMaterial({color:0x4affe1}));ring.rotation.x=-Math.PI/2;ring.position.y=2;marker.add(ring);const beam=new THREE.Mesh(new THREE.CylinderGeometry(3,3,70,16),new THREE.MeshBasicMaterial({color:0x53ebc4,transparent:true,opacity:.32}));beam.position.y=35;marker.add(beam);
  const keys=new Set();let active=false,crashed=false,heading=0,speed=0,view=0,turn=0,gameTime=0,noticeUntil=0,prevHeading=0;
  scooter.position.set(-600,1,-150);camera.position.set(-600,70,-40);
  const notice=(msg,bad=false)=>{$('notice').textContent=msg;$('notice').classList.add('show');$('notice').classList.toggle('bad',bad);noticeUntil=gameTime+3.1;};
  const penalty=(msg,amount=50)=>{fines+=amount;xp=Math.max(0,xp-20);notice(`⚠ ${msg}: multa virtual ${amount}`,true);};
  function district(x,z){if(x<0&&z<0)return 'CENTRO URBANO';if(x>=0&&z<0)return 'BAIRROS • ZONA 30';if(x<0&&z>=0)return 'ORLA • LITORAL';return 'SERRAS E ZONA RURAL';}
  function reset(){scooter.position.set(-600,1,-150);heading=0;speed=0;crashed=false;active=true;turn=0;$('arrest').classList.add('hidden');}
  $('play').addEventListener('click',()=>{helm=$('helmet').checked;helmetMesh.visible=helm;$('helmetIcon').textContent=helm?'🪖 Capacete ✓':'⚠ Sem capacete';$('intro').classList.add('hidden');reset();if(!helm)penalty('Capacete ausente',120);});$('retry').addEventListener('click',reset);
  addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(!e.repeat&&k==='q')turn=turn===-1?0:-1;if(!e.repeat&&k==='e')turn=turn===1?0:1;if(!e.repeat&&k==='c')view=(view+1)%3;if(!e.repeat&&k==='r')reset();if(!e.repeat&&k==='h'&&active)notice('📢 Buzina acionada');});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(k);});for(const n of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(n,()=>keys.delete(k));});
  let lastPenalty=-100,lastAward=0,previousJunction='';
  function update(dt){
    gameTime+=dt;const clockHours=(12+Math.floor(gameTime/32))%24;$('worldClock').textContent=(clockHours>=6&&clockHours<19?'☀ ':'☾ ')+String(clockHours).padStart(2,'0')+':00';const day=Math.max(.15,Math.sin((clockHours-5)/24*Math.PI*2)*.8+.4);sun.intensity=day*2.8;scene.background.setHSL(.56,.62,.22+day*.43);scene.fog.color.copy(scene.background);renderer.toneMappingExposure=.78+day*.55;beamLight.intensity=day<.5?3.3:.7;brakeMat.color.setHex(keys.has(' ')?0xff1717:0xa72b25);lampGlow.color.setHex(day<.45?0xffedb0:0xa1a59b);for(const cloud of clouds)cloud.position.x+=dt*.6;
    const signalPhase=Math.floor(gameTime/9)%3;for(const light of lights)for(let i=0;i<3;i++)light.bulb[i].material.color.setHex(signalPhase===i?[0xff3333,0xffc44a,0x48e68b][i]:[0x501515,0x514422,0x16452d][i]);
    for(const c of cars){let factor=1;const xx=c.axis?c.pos:c.lane+(c.dir>0?19:-19),zz=c.axis?c.lane+(c.dir>0?19:-19):c.pos;if(Math.hypot(xx-scooter.position.x,zz-scooter.position.z)<80&&Math.abs(speed)<20)factor=.2;c.pos+=c.dir*c.v*dt*factor;if(c.pos>2080)c.pos=-2080;if(c.pos< -2080)c.pos=2080;c.car.position.set(c.axis?c.pos:c.lane+(c.dir>0?19:-19),0,c.axis?c.lane+(c.dir>0?19:-19):c.pos);c.car.rotation.y=c.axis?(c.dir>0?-Math.PI/2:Math.PI/2):(c.dir>0?Math.PI:0);}
    if(!active||crashed)return;
    const acc=keys.has('w')||keys.has('arrowup'),back=keys.has('s')||keys.has('arrowdown'),left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright'),brake=keys.has(' ');
    if(acc)speed+=48*dt;if(back)speed-=32*dt;if(!acc&&!back)speed*=Math.pow(.982,dt*60);if(brake)speed*=Math.pow(.82,dt*60);speed=THREE.MathUtils.clamp(speed,-24,80);if(Math.abs(speed)<.3)speed=0;
    heading+=((right?1:0)-(left?1:0))*dt*1.25*Math.min(1,Math.abs(speed)/8)*(speed>=0?1:-1);scooter.rotation.y=heading;scooter.position.x-=Math.sin(heading)*speed*dt;scooter.position.z-=Math.cos(heading)*speed*dt;scooter.position.x=THREE.MathUtils.clamp(scooter.position.x,-2050,2050);scooter.position.z=THREE.MathUtils.clamp(scooter.position.z,-2050,2050);
    const x=scooter.position.x,z=scooter.position.z,kmh=Math.round(Math.abs(speed)*1.5),sector=district(x,z),limit=sector.includes('BAIRROS')?30:sector.includes('ORLA')?50:sector.includes('SERRAS')?50:60;$('speed').textContent=kmh;$('district').textContent=sector;$('limit').textContent=`LIMITE ${limit} km/h`;$('street').textContent=sector;$('rules').textContent='RESPEITE A SINALIZAÇÃO';
    if(kmh>limit+5&&gameTime-lastPenalty>9){penalty('Excesso de velocidade',70);lastPenalty=gameTime;}
    if(Math.abs(heading-prevHeading)>.38){if(!turn&&kmh>10&&gameTime-lastPenalty>5){penalty('Conversão sem seta',35);lastPenalty=gameTime;}else if(turn){xp+=10;notice('+10 XP: conversão sinalizada');turn=0;}prevHeading=heading;}
    const nearRoad=mainRoads.some(p=>Math.abs(x-p)<48)||mainRoads.some(p=>Math.abs(z-p)<48);
    if(!nearRoad&&kmh>12&&gameTime-lastPenalty>8){penalty('Circulação fora da via',90);lastPenalty=gameTime;}
    if(x>1200&&z>1200&&kmh>60&&gameTime-lastPenalty>10){penalty('Acesso irregular à via expressa',120);lastPenalty=gameTime;}
    const junctionX=mainRoads.find(p=>Math.abs(x-p)<28),junctionZ=mainRoads.find(p=>Math.abs(z-p)<28),jkey=junctionX===undefined||junctionZ===undefined?'':`${junctionX},${junctionZ}`;
    if(jkey&&jkey!==previousJunction){if(signalPhase===0&&kmh>10&&gameTime-lastPenalty>4){penalty('Avançou o sinal vermelho',100);lastPenalty=gameTime;}else if(kmh<18){xp+=12;notice('+12 XP: cruzamento prudente');}previousJunction=jkey;}if(!jkey)previousJunction='';
    for(const c of cars)if(Math.hypot(c.car.position.x-x,c.car.position.z-z)<19){crashed=true;active=false;penalty('Colisão de trânsito',120);$('arrest').classList.remove('hidden');break;}
    const target=missions[missionIndex%missions.length];marker.position.set(target.x,0,target.z);const remaining=Math.hypot(x-target.x,z-target.z);$('missionTitle').textContent=target.label;$('missionDistance').textContent=`Destino: ${Math.round(remaining)} m`;
    if(remaining<45&&kmh<12){missionIndex++;xp+=120;credits+=80;notice('📦 Entrega realizada! +120 XP / +80 créditos');}
    if(gameTime-lastAward>6&&kmh>0&&kmh<=limit){xp+=5;lastAward=gameTime;}
    $('xp').textContent=xp;$('credits').textContent=credits;$('fines').textContent=fines;
    if(gameTime>noticeUntil)$('notice').classList.remove('show');for(const [id,dir] of [['leftIndicator',-1],['rightIndicator',1]])$(id).classList.toggle('active',turn===dir&&Math.floor(gameTime*3)%2===0);
    $('lightRed').className=signalPhase===0?'on-red':'';$('lightAmber').className=signalPhase===1?'on-amber':'';$('lightGreen').className=signalPhase===2?'on-green':'';
    for(let i=0;i<blink.length;i++)blink[i].material.color.setHex(turn===i*2-1&&Math.floor(gameTime*3)%2===0?0xffc33d:0x85642d);
  }
  const rearDirection=new THREE.Vector3(),tmp=new THREE.Vector3();
  function cameraUpdate(dt){const target=scooter.position.clone(),offset=view===0?new THREE.Vector3(0,44,94):view===1?new THREE.Vector3(0,128,42):new THREE.Vector3(0,53,-9);offset.applyAxisAngle(new THREE.Vector3(0,1,0),heading);camera.position.lerp(target.add(offset),Math.min(1,dt*5));const focus=scooter.position.clone().add(new THREE.Vector3(-Math.sin(heading)*94,view===2?48:18,-Math.cos(heading)*94));camera.lookAt(focus);scooter.visible=view!==2;}
  function renderMirrors(){const originalTarget=renderer.getRenderTarget();scooter.visible=false;for(let i=0;i<2;i++){const mcam=mirrorCameras[i];mcam.position.copy(scooter.position).add(new THREE.Vector3(i===0?-24:24,54,-20).applyAxisAngle(new THREE.Vector3(0,1,0),heading));mcam.lookAt(mcam.position.clone().add(new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)).multiplyScalar(120)));renderer.setRenderTarget(mirrorTargets[i]);renderer.render(scene,mcam);}renderer.setRenderTarget(originalTarget);scooter.visible=view!==2;}
  // Mini-espelhos HUD com tráfego atrás para complementar os espelhos WebGL reais.
  function mirrorHUD(id,side){const cv=$(id),c=cv.getContext('2d');c.fillStyle='#92c8e1';c.fillRect(0,0,180,50);c.fillStyle='#80ab74';c.fillRect(0,50,180,50);c.fillStyle='#40535f';c.beginPath();c.moveTo(66,50);c.lineTo(114,50);c.lineTo(180,100);c.lineTo(0,100);c.fill();for(const car of cars){const dx=car.car.position.x-scooter.position.x,dz=car.car.position.z-scooter.position.z,behind=dx*Math.sin(heading)+dz*Math.cos(heading),lateral=dx*Math.cos(heading)-dz*Math.sin(heading);if(behind<10||behind>220||Math.sign(lateral)!==side)continue;const sc=1-behind/260;c.fillStyle='#ef6658';c.fillRect(90+lateral*sc-9,58+sc*35,18*sc,11*sc);}}
  const clock=new THREE.Clock();let mirrorTick=0;
  function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);update(dt);cameraUpdate(dt);mirrorTick++;if(mirrorTick%5===0)renderMirrors();renderer.render(scene,camera);mirrorHUD('mirrorLeft',-1);mirrorHUD('mirrorRight',1);}loop();
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  window.__urbanRiderWebGL=true;
})();
