import{esc,mk,Cfg,store,toast,BG}from'../core.js';

const T=(k,label,sub)=>`<div class="set-row"><div class="t"><b>${label}</b><s>${sub}</s></div>
  <div class="sw${Cfg.get(k)?' on':''}" data-sw="${k}"></div></div>`;
const IN=(k,label,sub,ph)=>`<div class="set-row"><div class="t"><b>${label}</b><s>${sub}</s></div>
  <input class="inp" data-in="${k}" value="${esc(Cfg.get(k)||'')}" placeholder="${ph||''}" style="max-width:280px"></div>`;

export default async function(ctx){
  const root=mk('div');ctx.host.append(root);
  root.innerHTML=`
    <div class="sec" style="margin-top:0"><h2>Appearance</h2></div>
    <div class="card">
      <div class="set-row"><div class="t"><b>Theme</b><s>base palette</s></div>
        <div class="swatches">${['ember','void','paper'].map(t=>
          `<div class="sw-s${Cfg.get('theme')===t?' on':''}" data-th="${t}" style="background:${
            t==='ember'?'#ff6a3d':t==='void'?'#7c8cff':'#ff8a4c'}"></div>`).join('')}</div></div>
      ${T('anim','Animations','background motion and transitions')}
      ${T('bgOn','Live background','particle field, pauses when hidden')}
      ${T('grain','Film grain','overlay texture')}
      ${T('glow','Ambient glow','radial page wash')}
      ${T('low','Performance mode','halve background framerate')}
      ${T('railOff','Collapsed sidebar','Ctrl B')}
    </div>
    <div class="sec"><h2>Privacy & protection</h2></div>
    <div class="card">
      ${T('stealth','Shield embeds','wrap players in a blob so src never shows')}
      ${T('noctx','Block right-click','custom menu outside players')}
      ${T('nodrag','Lock images','stop drag-to-save')}
      ${T('devtools','DevTools badge','flag when inspect is open')}
    </div>
    <div class="sec"><h2>Playback</h2></div>
    <div class="card">
      <div class="set-row"><div class="t"><b>Default search engine</b><s>used by the omnibox</s></div>
        <select class="sel" data-in="engine">${['Google','DuckDuckGo','Bing','Brave','Startpage','Ecosia']
          .map(e=>`<option ${Cfg.get('engine')===e?'selected':''}>${e}</option>`).join('')}</select></div>
      ${T('autoNext','Auto next episode','uses player postMessage events')}
    </div>
    <div class="sec"><h2>API keys (optional)</h2></div>
    <div class="card">
      ${IN('tmdb','TMDB key','full movie/TV search + art — free at themoviedb.org','paste key')}
      ${IN('rawg','RAWG key','cover art for games — free at rawg.io','paste key')}
      <p class="desc" style="margin-top:10px">Without keys everything still runs.</p>
    </div>
    <div class="sec"><h2>Data</h2></div>
    <div class="card" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" id="exp">Export config</button>
      <button class="btn" id="imp">Import config</button>
      <button class="btn" id="clrA" style="color:#f87171">Reset everything</button>
    </div>
    <div class="sec"><h2>About</h2></div>
    <div class="card"><div class="kv">
      <dt>build</dt><dd>Moplite v4.0.0</dd><dt>frames</dt><dd>blob-shielded, no src attribute</dd>
      <dt>keys used</dt><dd>0 required</dd><dt>storage</dt><dd>local only</dd></div></div>`;

  root.querySelectorAll('[data-sw]').forEach(s=>s.onclick=()=>{Cfg.set(s.dataset.sw,!Cfg.get(s.dataset.sw));s.classList.toggle('on')});
  root.querySelectorAll('[data-in]').forEach(i=>i.onchange=()=>Cfg.set(i.dataset.in,i.value));
  root.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{Cfg.set('theme',b.dataset.th);
    root.querySelectorAll('[data-th]').forEach(x=>x.classList.toggle('on',x===b))});
  root.querySelector('#exp').onclick=()=>{
    const a=mk('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(store.all(),null,1)],{type:'application/json'}));
    a.download='moplite-config.json';a.click()};
  root.querySelector('#imp').onclick=()=>{const i=mk('input');i.type='file';i.accept='.json';
    i.onchange=async()=>{const d=JSON.parse(await i.files[0].text());
      Object.entries(d).forEach(([k,v])=>store.set(k,v));location.reload()};i.click()};
  root.querySelector('#clrA').onclick=()=>{if(confirm('Wipe all local data?')){store.wipe();location.reload()}};
  return()=>{};
}
