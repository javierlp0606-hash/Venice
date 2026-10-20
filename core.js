/* ================= Moplite v4 — core ================= */
const K='mop4.';
export const $=(s,r=document)=>r.querySelector(s);
export const $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const mk=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
export const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const rnd=n=>Math.random().toString(36).slice(2,2+n);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---- FIX: store was never exported ---- */
export const store={
  get(k,d){try{const v=localStorage.getItem(K+k);return v==null?d:JSON.parse(v)}catch{return d}},
  set(k,v){try{localStorage.setItem(K+k,JSON.stringify(v))}catch{}},
  del(k){try{localStorage.removeItem(K+k)}catch{}},
  all(){const o={};for(const k of Object.keys(localStorage))if(k.startsWith(K))o[k.slice(K.length)]=store.get(k.slice(K.length));return o},
  wipe(){for(const k of Object.keys(localStorage))if(k.startsWith(K))localStorage.removeItem(k)}
};

/* ---------- settings ---------- */
const DEF={theme:'ember',bgOn:true,bgDensity:1,grain:true,anim:true,glow:true,railOff:false,low:false,
  stealth:true,nodrag:true,noctx:true,devtools:true,engine:'duckduckgo',proxy:0,mprov:0,aprov:0,
  sub:true,autoNext:true,aiModel:'gpt-4o-mini',tmdb:'',rawg:'',resume:true,name:'',bio:'',acc:''};
let CFG=Object.assign({},DEF,store.get('cfg',{}));

const ACC={home:'#ff6a3d',web:'#5b8cff',movies:'#f2547d',anime:'#b06bff',games:'#7de84f',
  ai:'#ff5fa2',settings:'#8b8b9a',profile:'#2fd6c9'};

export const Cfg={
  get:k=>CFG[k],
  set(k,v){CFG[k]=v;store.set('cfg',CFG);apply();},
  all:()=>CFG,
  reset(){CFG={...DEF};store.set('cfg',CFG);apply();}
};

function apply(){
  const b=document.body;
  b.classList.toggle('rail-off',!!CFG.railOff);
  b.classList.toggle('noanim',!CFG.anim);
  b.classList.toggle('nograin',!CFG.grain);
  b.classList.toggle('noglow',!CFG.glow);
  b.classList.toggle('nodrag',!!CFG.nodrag);
  b.classList.toggle('low',!!CFG.low);
  document.documentElement.dataset.theme=CFG.theme||'ember';
  if(CFG.acc){document.documentElement.style.setProperty('--acc',CFG.acc);
    document.documentElement.style.setProperty('--accd',CFG.acc+'22')}
  BG.set({on:CFG.bgOn,density:CFG.bgDensity});
}

/* ---------- toast / modal / context menu ---------- */
export function toast(msg,kind=''){
  const t=mk('div','toast '+kind,esc(msg));
  const box=$('#toasts');if(!box)return;
  box.append(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(6px)';setTimeout(()=>t.remove(),220)},3000);
}
export function modal(title,html,onMount){
  const m=$('#modal');if(!m)return;
  $('#mTitle').textContent=title;$('#mBody').innerHTML=html;m.hidden=false;
  m.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
  m.onclick=e=>{if(e.target===m)closeModal()};
  onMount&&onMount($('#mBody'));
}
export function closeModal(){const m=$('#modal');if(m){m.hidden=true;$('#mBody').innerHTML=''}}

function contextMenu(x,y,items){
  const c=$('#ctx');if(!c)return;
  c.innerHTML='';
  for(const it of items){
    if(it==='-'){c.append(mk('hr'));continue}
    const b=mk('button','',esc(it.l));
    b.onclick=()=>{c.hidden=true;it.fn()};
    c.append(b);
  }
  c.hidden=false;
  c.style.left=Math.min(x,innerWidth-c.offsetWidth-10)+'px';
  c.style.top=Math.min(y,innerHeight-c.offsetHeight-10)+'px';
}
addEventListener('pointerdown',e=>{const c=$('#ctx');if(c&&!c.contains(e.target))c.hidden=true});
addEventListener('keydown',e=>{if(e.key==='Escape'){const c=$('#ctx');if(c)c.hidden=true;closeModal();closePal()}});

/* ---------- background engine ---------- */
export const BG=(()=>{
  const c=$('#bg');if(!c)return{start(){},set(){},tint(){},burst(){},pressure(){}};
  const x=c.getContext('2d');
  let W=0,H=0,DPR=1,P=[],M={x:-9e3,y:-9e3},R=[],raf=0,run=true,tint='#2fd6c9',frame=0,den=1;
  const link=138,rep=118;
  function size(){
    DPR=Math.min(devicePixelRatio||1,1.6);W=c.width=innerWidth*DPR;H=c.height=innerHeight*DPR;
    c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';seed();
  }
  function seed(){
    const n=Math.round(clamp(innerWidth/15,34,112)*den);
    P=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-.5)*.24*DPR,vy:(Math.random()-.5)*.24*DPR,r:(Math.random()*1.7+.5)*DPR}));
  }
  function tick(){
    raf=requestAnimationFrame(tick);
    if(!run||document.hidden)return;
    frame++;if(CFG.low&&frame%2)return;
    x.clearRect(0,0,W,H);
    const mx=M.x*DPR,my=M.y*DPR;
    for(const p of P){
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>W)p.vx*=-1;
      if(p.y<0||p.y>H)p.vy*=-1;
      const dx=p.x-mx,dy=p.y-my,d2=dx*dx+dy*dy;
      if(d2<rep*rep*DPR*DPR&&d2>1){const d=Math.sqrt(d2);p.x+=dx/d*1.15;p.y+=dy/d*1.15}
    }
    x.lineWidth=.7*DPR;
    for(let i=0;i<P.length;i++){
      for(let j=i
