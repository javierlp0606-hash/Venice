import{esc,mk,Cfg,store,toast}from'../core.js';

export default async function(ctx){
  const root=mk('div');ctx.host.append(root);
  function paint(){
    const name=Cfg.get('name')||'Guest';
    const hue=name.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%360;
    root.innerHTML=`
      <div class="hero" style="min-height:180px">
        <div class="in"><div class="pstr" style="width:92px;flex:0 0 92px;aspect-ratio:1;display:grid;place-content:center;
          background:linear-gradient(150deg,hsl(${hue} 70% 62%),hsl(${hue+40} 70% 52%));border:0">
          <span style="font-size:36px;font-weight:800;color:#0a0a0c">${esc(name[0].toUpperCase())}</span></div>
        <div><h2 style="font-size:24px">${esc(name)}</h2>
        <p class="desc">${esc(Cfg.get('bio')||'local profile · stored on this device only')}</p></div></div></div>
      <div class="split" style="margin-top:20px">
        <div class="card"><b style="font-size:13px">Identity</b>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
            <input class="inp" id="pn" value="${esc(name)}" placeholder="Display name">
            <input class="inp" id="pb" value="${esc(Cfg.get('bio')||'')}" placeholder="Status line">
            <button class="btn p" id="ps">Save</button></div>
          <div class="sec"><h2 style="font-size:13px">Recently played</h2></div>
          <div style="display:flex;gap:7px;flex-wrap:wrap">${store.get('recent',[]).map(n=>
            `<span class="chip">◘ ${esc(n)}</span>`).join('')||'<span class="desc">nothing yet</span>'}</div>
          <div class="sec"><h2 style="font-size:13px">Bookmarks</h2></div>
          <div style="display:flex;gap:7px;flex-wrap:wrap">${store.get('bms',[]).map(b=>
            `<a class="chip" href="#/web/${encodeURIComponent(b)}">${esc(b.split('/')[2]||b)}</a>`).join('')||'<span class="desc">nothing yet</span>'}</div>
        </div>
        <div class="card"><b style="font-size:13px">Stats</b>
          <div class="kv" style="margin-top:12px">
            <dt>chat turns</dt><dd>${store.get('chat',[]).length/2|0}</dd>
            <dt>games opened</dt><dd>${store.get('recent',[]).length}</dd>
            <dt>bookmarks</dt><dd>${store.get('bms',[]).length}</dd>
            <dt>settings</dt><dd>local</dd></div>
        </div>
      </div>`;
    root.querySelector('#ps').onclick=()=>{
      Cfg.set('name',root.querySelector('#pn').value.trim()||'Guest');
      Cfg.set('bio',root.querySelector('#pb').value.trim());paint();toast('Saved','ok')};
  }
  paint();return()=>{};
}
