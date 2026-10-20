import{embed,esc,mk,Cfg,api,store}from'../core.js';

export default async function(ctx){
  const {host,id,sub}=ctx;
  const root=mk('div');host.append(root);
  let all=[],tag='all',q='';
  try{all=await api.games()}catch{all=[]}

  root.innerHTML=`
    <div class="hero" style="min-height:200px;background:linear-gradient(120deg,#7de84f14,transparent)">
      <div class="in"><div>
        <span class="chip" style="color:#7de84f;border-color:#7de84f33;background:#7de84f1a">ARCADE · NO DOWNLOADS</span>
        <h2 style="font-size:26px;margin:12px 0 6px;letter-spacing:-.03em">Games that just run.</h2>
        <p class="desc">Every title is a real HTML5 build, framed in the shell with a shield.</p>
        <input class="inp" id="gQ" placeholder="Filter games…" style="max-width:360px;margin-top:14px">
      </div></div>
    </div>
    <div class="sec"><h2>Library</h2><span class="sp"></span><span class="chip" id="gN"></span></div>
    <div id="gTags" style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px"></div>
    <div class="grid g4" id="gGrid"></div>`;

  const tags=[...new Set(all.flatMap(g=>g.t||[]))].sort();
  root.querySelector('#gTags').innerHTML=['all',...tags].map(t=>
    `<button class="chip${t===tag?' a':''}" data-t="${esc(t)}">${esc(t)}</button>`).join('');
  root.querySelectorAll('#gTags .chip').forEach(b=>b.onclick=()=>{
    tag=b.dataset.t;root.querySelectorAll('#gTags .chip').forEach(x=>x.classList.toggle('a',x===b));paint()});
  root.querySelector('#gQ').oninput=e=>{q=e.target.value.toLowerCase();paint()};

  function paint(){
    const list=all.filter(g=>(tag==='all'||(g.t||[]).includes(tag))&&(!q||g.n.toLowerCase().includes(q)));
    root.querySelector('#gN').textContent=list.length+' titles';
    root.querySelector('#gGrid').innerHTML=list.map(x=>{
      let d='';try{d=new URL(x.u).hostname}catch(e){}
      return `<a class="tile" href="#/games/play/${esc(x.n.toLowerCase().replace(/\W+/g,'-'))}">
        <div style="position:absolute;inset:0;display:grid;place-content:center;font-size:34px;font-weight:800;
          background:linear-gradient(150deg,#7de84f22,#0000);color:#7de84f">${esc(x.n[0])}</div>
        <div class="tb"><img class="fav" loading="lazy" src="https://www.google.com/s2/favicons?sz=64&domain=${esc(d)}" alt="">
        <b>${esc(x.n)}</b></div></a>`;
    }).join('')||'<div class="empty"><b>Nothing here</b></div>';
  }
  paint();

  if(id==='play'){
    const g=all.find(x=>x.n.toLowerCase().replace(/\W+/g,'-')===sub)||all[0];
    if(!g)return()=>{};
    const rec=store.get('recent',[]).filter(r=>r!==g.n);rec.unshift(g.n);store.set('recent',rec.slice(0,12));
    const stage=mk('div');
    root.prepend(stage);
    stage.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <a class="lk" href="#/games" style="font-size:12px">← library</a><b style="font-size:15px">${esc(g.n)}</b>
      <span class="sp"></span><button class="btn sm" id="gRaw">Open raw</button></div>`;
    const holder=mk('div');stage.append(holder);
    holder.style.cssText='height:calc(100vh - 250px);min-height:440px;display:flex';
    const fr=embed(holder,g.u,{ratio:'r16',title:g.n});
    if(fr){fr.style.flex='1';fr.style.setProperty('--acc','#7de84f')}
    stage.querySelector('#gRaw').onclick=()=>window.open(g.u,'_blank','noopener');
  }
  return()=>{};
}
