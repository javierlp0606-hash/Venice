import{embed,esc,mk,Cfg,toast,providers,store}from'../core.js';

export default async function(ctx){
  const {host,id}=ctx;
  const P=await providers();
  const root=mk('div');host.append(root);
  const tabs=store.get('tabs',[]);
  let cur=0;

  root.innerHTML=`
    <div class="wtabs" id="wTabs"></div>
    <div class="omn">
      <button class="ib" id="wBack">←</button><button class="ib" id="wFwd">→</button>
      <button class="ib" id="wRel">⟳</button><button class="ib" id="wHome">⌂</button>
      <input class="inp" id="wUrl" placeholder="search or enter a URL" spellcheck="false">
      <select class="sel" id="wEng"></select>
      <select class="sel" id="wProxy"></select>
      <button class="ib" id="wBm" title="Bookmark">★</button>
      <button class="ib" id="wNew">+</button>
    </div>
    <div id="wStage"></div>`;

  const engSel=root.querySelector('#wEng');
  engSel.innerHTML=P.engines.map(e=>`<option value="${esc(e.name)}">${esc(e.name)}</option>`).join('');
  engSel.value=Cfg.get('engine');
  engSel.onchange=()=>Cfg.set('engine',engSel.value);

  const pxSel=root.querySelector('#wProxy');
  pxSel.innerHTML=P.proxies.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join('');
  pxSel.value=Cfg.get('proxy')||0;
  pxSel.onchange=()=>{Cfg.set('proxy',+pxSel.value);tabs[cur].url?load(tabs[cur].url):startPage()};

  const eng=()=>P.engines.find(e=>e.name===Cfg.get('engine'))||P.engines[0];
  const resolve=v=>{
    if(!v)return '';
    if(/^https?:\/\//i.test(v))return v;
    if(/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v)&&!v.includes(' '))return 'https://'+v;
    return eng().q+encodeURIComponent(v);
  };

  function ensure(){if(!tabs.length)tabs.push({url:'',hist:[],hi:-1})}
  function save(){store.set('tabs',tabs.slice(0,8))}
  function paintTabs(){
    root.querySelector('#wTabs').innerHTML=tabs.map((t,i)=>
      `<div class="wtab${i===cur?' on':''}" data-i="${i}"><b>${esc(t.url?t.url.split('/')[2]||t.url:'start')}</b><span class="x" data-x="${i}">✕</span></div>`).join('');
    root.querySelectorAll('.wtab').forEach(e=>e.onclick=ev=>{
      if(ev.target.dataset.x!=null){ev.stopPropagation();tabs.splice(+ev.target.dataset.x,1);cur=Math.max(0,cur-1);ensure();save();render();return}
      cur=+e.dataset.i;render()});
  }
  function render(){paintTabs();root.querySelector('#wUrl').value=tabs[cur].url||'';
    if(!tabs[cur].url)return startPage();load(tabs[cur].url)}
  function load(u){
    const p=P.proxies[+pxSel.value];
    embed(root.querySelector('#wStage'),u,{ratio:'',title:u}).style.cssText='height:calc(100vh - 265px);min-height:460px';
  }
  function nav(u){
    const t=tabs[cur];t.hist=t.hist.slice(0,t.hi+1);t.hist.push(u);t.hi=t.hist.length-1;t.url=u;save();render();
  }
  function startPage(){
    const stage=root.querySelector('#wStage');
    const bms=store.get('bms',[]);
    stage.innerHTML=`<div class="sec" style="margin-top:6px"><h2>Search the web</h2><span class="sp"></span>
        <span class="chip">proxied · ${esc((P.proxies[+pxSel.value]||{}).name||'')}</span></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
        ${P.engines.map(e=>`<div class="card eng" data-q="${esc(e.name)}">
          <img src="https://www.google.com/s2/favicons?sz=64&domain=${esc(e.ico)}" alt=""><b>${esc(e.name)}</b></div>`).join('')}
      </div>
      ${bms.length?'<div class="sec"><h2>Bookmarks</h2></div><div class="card" id="bms"></div>':''}`;
    stage.querySelectorAll('[data-q]').forEach(e=>e.onclick=()=>{
      engSel.value=e.dataset.q;Cfg.set('engine',e.dataset.q);
      const q=root.querySelector('#wUrl').value.trim();q?nav(resolve(q)):root.querySelector('#wUrl').focus()});
    if(bms.length)stage.querySelector('#bms').innerHTML=bms.map((b,i)=>
      `<div class="bm" data-b="${i}"><img src="https://www.google.com/s2/favicons?sz=32&domain=${esc(b.split('/')[2]||b)}" alt="">
        <span style="font-size:13px">${esc(b)}</span><span class="sp"></span><span class="x" data-d="${i}" style="color:#f87171">✕</span></div>`).join('');
    stage.querySelectorAll('.bm').forEach(e=>e.onclick=ev=>{
      if(ev.target.dataset.d!=null){store.set('bms',bms.filter((_,i)=>i!=+ev.target.dataset.d));render();return}
      nav(bms[+e.dataset.b])});
  }

  root.querySelector('#wUrl').onkeydown=e=>{
    if(e.key!=='Enter')return;const v=e.target.value.trim();if(!v)return startPage();nav(resolve(v))};
  root.querySelector('#wBack').onclick=()=>{const t=tabs[cur];if(t.hi>0){t.hi--;t.url=t.hist[t.hi];render()}};
  root.querySelector('#wFwd').onclick=()=>{const t=tabs[cur];if(t.hi<t.hist.length-1){t.hi++;t.url=t.hist[t.hi];render()}};
  root.querySelector('#wRel').onclick=()=>{tabs[cur].url?load(tabs[cur].url):startPage()};
  root.querySelector('#wHome').onclick=()=>{tabs[cur].url='';render()};
  root.querySelector('#wNew').onclick=()=>{tabs.push({url:'',hist:[],hi:-1});cur=tabs.length-1;save();render()};
  root.querySelector('#wBm').onclick=()=>{const u=tabs[cur].url;if(!u)return;
    const b=store.get('bms',[]);if(!b.includes(u))b.unshift(u);store.set('bms',b.slice(0,30));toast('Bookmarked','ok')};
  addEventListener('keydown',e=>{if(e.altKey&&e.key==='ArrowLeft')root.querySelector('#wBack').click();
    if(e.altKey&&e.key==='ArrowRight')root.querySelector('#wFwd').click()});

  ensure();
  if(id)nav(resolve(id));else render();
  return()=>{};
}
