/* Renderizador 3D em perspectiva, sem dependências e compatível com file://. */
(() => {
  'use strict';
  const holder=document.getElementById('scene'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');holder.append(canvas);
  canvas.style.width='100%';canvas.style.height='100%';
  let w=0,h=0,dpr=1,started=false,arrested=false,speed=0,yaw=0,last=0,distance=0,turn=0,view=0,phase=0;
  const player={x:15,z:140},keys=new Set(),roads=[-600,-300,0,300,600],cars=[];
  const missionStops=[{x:300,z:-300,name:'Entregar encomenda na Avenida Norte'},{x:-300,z:-300,name:'Entrega no bairro comercial'},{x:-600,z:300,name:'Entrega junto à rotatória'},{x:450,z:-370,name:'Documentos na Prefeitura'}];
  const progress={xp:0,credits:0,fines:0,licensePoints:0,deliveries:0},penaltyTimes={};
  let helmet=true,missionIndex=0,lastXPAt=0,showNoticeUntil=0,previousYaw=0,lastIntersection='',lastZone='';
  const $=id=>document.getElementById(id);
  function alertPlayer(message,bad=false){$('notice').textContent=message;$('notice').classList.toggle('bad',bad);$('notice').classList.add('show');showNoticeUntil=phase+3.2;}
  function refreshUI(){const target=missionStops[missionIndex%missionStops.length];$('missionTitle').textContent=target.name;$('missionDistance').textContent=`Destino: ${Math.round(Math.hypot(target.x-player.x,target.z-player.z))} m`;$('xp').textContent=progress.xp;$('credits').textContent=progress.credits;$('fines').textContent=progress.fines;$('helmetIcon').textContent=helmet?'🪖 Capacete ✓':'⚠️ Sem capacete';}
  function penalty(key,reason,amount=50,points=2,cooldown=8){if(phase-(penaltyTimes[key]??-999)<cooldown)return;penaltyTimes[key]=phase;progress.fines+=amount;progress.licensePoints+=points;progress.xp=Math.max(0,progress.xp-20);alertPlayer(`⚠️ ${reason} · −20 XP · multa virtual ${amount}`,true);refreshUI();}
  const pedestrians=[{x:300,z:7,dir:1},{x:-300,z:-7,dir:-1},{x:7,z:300,dir:1},{x:-7,z:-300,dir:-1}];
  function size(){dpr=Math.min(2,devicePixelRatio||1);w=innerWidth;h=innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  addEventListener('resize',size);size();
  function rnd(n){const r=Math.sin(n*12.9898+78.233)*43758.5453;return r-Math.floor(r);}
  const buildings=[];
  for(let x=-750;x<=750;x+=150)for(let z=-750;z<=750;z+=150){if(roads.some(p=>Math.abs(x-p)<88)||roads.some(p=>Math.abs(z-p)<88))continue;if(x>330&&x<580&&z<-330&&z>-580)continue;const r=rnd(x*13+z);buildings.push({x,z,width:54+40*r,depth:54+20*r,height:30+90*r,color:['#e7c9a2','#d9b0aa','#c4d4e3','#e4dfc8'][Math.floor(r*4)]});}
  for(let i=0;i<24;i++){let axis=i%2,road=roads[Math.floor(i/2)%5],dir=(Math.floor(i/10)%2?1:-1),lane=dir===1?15:-15;cars.push({axis,road,dir,lane,pos:-820+i*139%1640,v:35+i%6*8,color:['#ef6959','#5ca2df','#ffcb56','#f7f7e8','#3b4757'][i%5]});}
  function poly(points,color,stroke){if(points.some(p=>!p))return;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function project(x,y,z){const dx=x-player.x,dz=z-player.z;const c=Math.cos(yaw),s=Math.sin(yaw),rx=dx*c-dz*s,depth=-(dx*s+dz*c);const cameraHeight=view===1?90:view===2?21:52;const cameraBack=view===1?80:view===2?0:120;const d=depth+cameraBack;if(d<4)return null;const f=(view===1?620:570)*Math.min(w/1000,1.5);return{x:w/2+rx*f/d,y:h*.56+(cameraHeight-y)*f/d,z:d};}
  function quad3(coords,color){poly(coords.map(v=>project(...v)),color);}
  function cuboid(x,z,ww,dd,hh,color){const x0=x-ww/2,x1=x+ww/2,z0=z-dd/2,z1=z+dd/2;const vertices=[[x0,0,z0],[x1,0,z0],[x1,0,z1],[x0,0,z1],[x0,hh,z0],[x1,hh,z0],[x1,hh,z1],[x0,hh,z1]];const faces=[[3,2,6,7],[2,1,5,6],[1,0,4,5],[0,3,7,4],[4,5,6,7]];const shades=[.65,.8,.9,.75,1];const rgb=parseInt(color.slice(1),16),r=rgb>>16,g=(rgb>>8)&255,b=rgb&255;for(let i=0;i<faces.length;i++){const pts=faces[i].map(idx=>project(...vertices[idx]));const q=shades[i];poly(pts,`rgb(${Math.floor(r*q)},${Math.floor(g*q)},${Math.floor(b*q)})`,'#192c3620');}}
  const drawables=[];
  function addDraw(x,z,fn){const d=(x-player.x)**2+(z-player.z)**2;drawables.push({d,fn});}
  function roadSegment(x1,z1,x2,z2,width){const half=width/2;if(x1===x2)quad3([[x1-half,.05,z1],[x1+half,.05,z1],[x2+half,.05,z2],[x2-half,.05,z2]],'#435662');else quad3([[x1,.06,z1-half],[x1,.06,z1+half],[x2,.06,z2+half],[x2,.06,z2-half]],'#435662');}
  function render(){ctx.fillStyle='#8dcaee';ctx.fillRect(0,0,w,h);const horizon=h*.56;ctx.fillStyle='#8bbd79';ctx.fillRect(0,horizon,w,h-horizon);
    // Quadras e avenidas em blocos próximos, para desenhar tudo em perspectiva.
    const cx=Math.round(player.x/150)*150,cz=Math.round(player.z/150)*150;
    for(let gx=-950;gx<=950;gx+=150)for(let gz=-950;gz<=950;gz+=150){const x=cx+gx,z=cz+gz;if(Math.abs(x)>950||Math.abs(z)>950)continue;addDraw(x,z,()=>quad3([[x-76,0,z-76],[x+76,0,z-76],[x+76,0,z+76],[x-76,0,z+76]],'#80b56c'));}
    for(const road of roads){for(let p=-900;p<900;p+=75){addDraw(road,p,()=>{roadSegment(road,p,road,p+75,76);if(p%150===0)roadSegment(road,p,road,p+18,1.4);});addDraw(p,road,()=>{roadSegment(p,road,p+75,road,76);if(p%150===0)roadSegment(p,road,p+18,road,1.4);});}}
    for(const b of buildings)if(Math.hypot(b.x-player.x,b.z-player.z)<1050)addDraw(b.x,b.z,()=>cuboid(b.x,b.z,b.width,b.depth,b.height,b.color));
    // Rotatórias e ilhas centrais, renderizadas como polígonos.
    for(const [x,z] of [[0,0],[-600,300]])addDraw(x,z,()=>{for(let r=77;r>32;r-=8){const pts=[];for(let i=0;i<25;i++){const a=i/24*Math.PI*2;pts.push(project(x+Math.cos(a)*r,.22,z+Math.sin(a)*r));}poly(pts,r>46?'#354c56':'#7cb66a');}});
    addDraw(450,-470,()=>{cuboid(450,-470,165,102,56,'#e5dac9');cuboid(450,-470,185,116,6,'#b5c3ce');for(let i=-2;i<=2;i++)cuboid(450+i*25,-401,7,7,40,'#f9f9f0');});
    const target=missionStops[missionIndex%missionStops.length];addDraw(target.x,target.z,()=>{cuboid(target.x,target.z,9,9,42,'#48e7b8');cuboid(target.x,target.z,22,22,3,'#f6d769');});
    for(const person of pedestrians)if(Math.hypot(player.x-person.x,player.z-person.z)<800)addDraw(person.x,person.z,()=>{cuboid(person.x,person.z,5,5,16,'#f6cd93');cuboid(person.x,person.z,9,9,9,'#407dc1');});
    for(const x of [-300,300])for(const z of [-300,300])addDraw(x+42,z+42,()=>{cuboid(x+42,z+42,3,3,36,'#263b48');const state=Math.floor(phase/9)%3;cuboid(x+42,z+42,8,8,8,state===0?'#f35456':state===1?'#ffd45e':'#53d89b');for(let k=0;k<5;k++)quad3([[x-28+k*13,.2,z+48],[x-20+k*13,.2,z+48],[x-20+k*13,.2,z+60],[x-28+k*13,.2,z+60]],'#eeeeea');});
    for(const car of cars){const x=car.axis?car.pos:car.road+car.lane,z=car.axis?car.road+car.lane:car.pos;if(Math.hypot(player.x-x,player.z-z)<1000)addDraw(x,z,()=>{cuboid(x,z,car.axis?37:23,car.axis?23:37,14,car.color);cuboid(x,z,car.axis?22:17,car.axis?17:22,22,'#9dc1d0');});}
    drawables.sort((a,b)=>b.d-a.d);for(const item of drawables)item.fn();drawables.length=0;
    if(view!==2)drawScooter();
  }
  function drawScooter(){const x=w/2,y=h*.80,scale=Math.min(w/900,1.35);ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#192b36';ctx.beginPath();ctx.ellipse(0,14,35,65,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#40d8c9';ctx.beginPath();ctx.roundRect(-33,-80,66,145,18);ctx.fill();ctx.fillStyle='#142f3f';ctx.fillRect(-34,-22,68,54);ctx.fillStyle='#1b2830';ctx.fillRect(-85,-90,170,11);ctx.fillStyle='#2a3642';ctx.fillRect(-83,-102,25,32);ctx.fillRect(58,-102,25,32);ctx.fillStyle='#fef6bb';ctx.beginPath();ctx.arc(0,-78,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f2f0e6';ctx.beginPath();ctx.arc(0,-25,24,0,Math.PI*2);ctx.fill();ctx.restore();}
  function update(dt){
    if(!started||arrested)return;
    const forward=keys.has('w')||keys.has('arrowup'),backward=keys.has('s')||keys.has('arrowdown');
    if(forward)speed+=46*dt;if(backward)speed-=32*dt;if(!forward&&!backward)speed*=Math.pow(.975,dt*60);if(keys.has(' '))speed*=Math.pow(.85,dt*60);
    speed=Math.max(-25,Math.min(100,speed));if(Math.abs(speed)<.1)speed=0;
    const steer=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    yaw+=steer*dt*1.25*(speed<0?-1:1)*(Math.abs(speed)>1?1:0);
    player.x=Math.max(-845,Math.min(845,player.x-Math.sin(yaw)*speed*dt));player.z=Math.max(-845,Math.min(845,player.z-Math.cos(yaw)*speed*dt));distance+=Math.abs(speed*dt);
    const kmh=Math.round(Math.abs(speed)*1.5);$('speed').textContent=kmh;
    const zone30=Math.hypot(player.x-450,player.z+450)<220;const limit=zone30?30:50;$('limit').textContent=`LIMITE ${limit} km/h`;
    if(kmh>limit+5)penalty('speed','Excesso de velocidade',70,3,11);
    if(Math.abs(yaw-previousYaw)>.35){if(turn===0&&kmh>10)penalty('turn','Conversão sem sinalizar',35,1,6);else if(turn!==0){progress.xp+=10;alertPlayer('✅ Conversão sinalizada: +10 XP');turn=0;}previousYaw=yaw;}
    const roadNear=roads.some(p=>Math.abs(player.x-p)<43)||roads.some(p=>Math.abs(player.z-p)<43);
    if(!roadNear&&kmh>10)penalty('sidewalk','Circulação fora da pista',55,2,9);
    for(const car of cars){
      const x=car.axis?car.pos:car.road+car.lane,z=car.axis?car.road+car.lane:car.pos;
      const proximity=Math.hypot(player.x-x,player.z-z);
      const yieldToPlayer=proximity<70&&proximity>23&&kmh<25;
      const factor=yieldToPlayer?.18:1;
      car.pos+=car.dir*car.v*dt*factor;
      if(car.pos>875)car.pos=-875;if(car.pos< -875)car.pos=875;
      const nx=car.axis?car.pos:car.road+car.lane,nz=car.axis?car.road+car.lane:car.pos;
      if(Math.hypot(player.x-nx,player.z-nz)<19){crash();break;}
    }
    for(const person of pedestrians){const origin=person.z===300||person.z===-300?0:person.z>0?300:-300;person.x+=person.dir*dt*4;if(person.x>origin+34||person.x<origin-34)person.dir*=-1;if(Math.hypot(player.x-person.x,player.z-person.z)<10&&kmh>5)penalty('pedestrian','Não respeitou o pedestre',90,4,8);}
    if(player.x>370&&player.x<530&&player.z< -420&&player.z> -520&&Math.abs(speed)>20)crash();
    const junction=roads.find(x=>Math.abs(player.x-x)<28),cross=roads.find(z=>Math.abs(player.z-z)<28);
    const lightPhase=Math.floor(phase/9)%3;
    $('lightRed').className=lightPhase===0?'on-red':'';$('lightAmber').className=lightPhase===1?'on-amber':'';$('lightGreen').className=lightPhase===2?'on-green':'';
    const signalized=junction!==undefined&&cross!==undefined&&Math.abs(junction)===300&&Math.abs(cross)===300;
    const intersectionKey=signalized?`${junction},${cross}`:'';
    if(signalized&&intersectionKey!==lastIntersection){if(lightPhase===0&&kmh>8)penalty('red','Avançou o semáforo vermelho',100,5,3);else if(kmh<=15){progress.xp+=15;alertPlayer('✅ Aproximação segura: +15 XP');}lastIntersection=intersectionKey;}
    if(!signalized)lastIntersection='';
    const roundabouts=[[0,0],[-600,300]],round=roundabouts.find(([x,z])=>Math.hypot(player.x-x,player.z-z)<88);
    if(round&&!lastZone){if(kmh<=30){progress.xp+=20;alertPlayer('✅ Rotatória com velocidade prudente: +20 XP');}else penalty('roundabout','Entrada rápida na rotatória',40,2,5);lastZone='round';}if(!round)lastZone='';
    if(phase-lastXPAt>5&&kmh>0&&kmh<=limit){progress.xp+=5;lastXPAt=phase;}
    const target=missionStops[missionIndex%missionStops.length];if(Math.hypot(player.x-target.x,player.z-target.z)<33&&kmh<12){progress.xp+=120;progress.credits+=80;progress.deliveries++;missionIndex++;alertPlayer('📦 Entrega concluída! +120 XP e +80 créditos');}
    $('street').textContent=round?'ROTATÓRIA':zone30?'PREFEITURA • ZONA 30':'AVENIDAS DA CIDADE';$('rules').textContent=zone30?'ZONA 30':'MÃO ÚNICA / RESPEITE AS SETAS';refreshUI();
  }
  function crash(){if(arrested)return;arrested=true;started=false;penalty('collision','Colisão de trânsito',120,5,0);$('arrest').classList.remove('hidden');}
  function reset(){player.x=15;player.z=140;yaw=0;previousYaw=0;speed=0;turn=0;arrested=false;started=true;lastIntersection='';lastZone='';$('arrest').classList.add('hidden');refreshUI();}
  $('play').addEventListener('click',()=>{helmet=$('helmet').checked;$('intro').classList.add('hidden');reset();if(!helmet)penalty('helmet','Pilotagem sem capacete',120,5,0);});$('retry').addEventListener('click',reset);
  addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(!e.repeat&&k==='q')turn=turn===-1?0:-1;if(!e.repeat&&k==='e')turn=turn===1?0:1;if(!e.repeat&&k==='c')view=(view+1)%3;if(!e.repeat&&k==='r')reset();if(!e.repeat&&k==='h'&&started)alertPlayer('📢 Buzina acionada');});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(k);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(k));});
  function mirror(id,side){const c=document.getElementById(id).getContext('2d');c.fillStyle='#9fd0ea';c.fillRect(0,0,180,50);c.fillStyle='#6da066';c.fillRect(0,50,180,50);c.fillStyle='#45565f';c.beginPath();c.moveTo(72,50);c.lineTo(110,50);c.lineTo(180,100);c.lineTo(0,100);c.fill();for(const car of cars){const x=car.axis?car.pos:car.road+car.lane,z=car.axis?car.road+car.lane:car.pos;const dx=x-player.x,dz=z-player.z,behind=dx*Math.sin(yaw)+dz*Math.cos(yaw),lateral=dx*Math.cos(yaw)-dz*Math.sin(yaw);if(behind<10||behind>160||Math.sign(lateral)!==side)continue;const sc=1-behind/200;c.fillStyle='#ed6155';c.fillRect(90+lateral*sc-7,55+sc*30,14*sc,8*sc);}}
  function frame(t){const dt=Math.min(.04,(t-last)/1000||.016);last=t;phase+=dt;update(dt);render();mirror('mirrorLeft',-1);mirror('mirrorRight',1);if(phase>showNoticeUntil)$('notice').classList.remove('show');for(const [id,dir] of [['leftIndicator',-1],['rightIndicator',1]])document.getElementById(id).classList.toggle('active',turn===dir&&Math.floor(phase*2.5)%2===0);requestAnimationFrame(frame);}refreshUI();requestAnimationFrame(frame);
})();
