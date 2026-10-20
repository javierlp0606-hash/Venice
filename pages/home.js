import{esc,mk,Cfg,api,providers,store,BG,toast}from'../core.js';

export default async function(ctx){
  const {host}=ctx;
  const root=mk('div');host.append(root);
  const P=await providers().catch(()=>({proxies:[],engines:[]}));
  const name=Cfg.get('name')||'Guest';

  root.innerHTML=`
    <div class="hero" style="min-height:280px">
      <div class="in" style="flex-direction:column;align-items:flex-start">
        <span class="chip a" id="hClock">--:--:--</span>
        <h2 style="font-size:34px;letter-spacing:-.035em;margin:12px 0 4px" id="hHi">Hello, ${esc(name)}.</h2>
        <p class="desc">One shell. Web, movies, anime, games, AI — nothing redirects you out.</p>
        <div style="display:flex;gap:8px;margin-top:16px;width:100%;max-width:560px">
          <input class="inp" id="hQ" placeholder="Search the web or jump anywhere…">
          <button class="btn p" id="hGo">Go</button>
        </div>
      </div>
    </div>
    <div class="sec"><h2>Jump in</h2><span class="sp"></span><span class="chip">Ctrl K for everything</span></div>
    <div class="grid g4" id="hTiles"></div>
    <div id="hCont"></div>
    <div class="sec"><h2>Status</h2><span class="sp"></span><span class="chip" id="hPing">measuring…</span></div>
    <div class="card" id="hStat"></div>`;

  const TILES=[['Movies & TV','Live catalogue, 7 servers','▤','#f2547d','#/movies'],
    ['Anime','AniList + sub/dub episodes','✦','#b06bff','#/anime'],
    ['Games','HTML5 arcade, no install','◘','#7de84f','#/games'],
    ['Web','Proxied browser, tabs','◍','#5b8cff','#/web'],
    ['AI','Chat + image render','✳','#ff5fa2','#/ai'],
    ['Settings','Tune the shell','⚙','#8b8b9a','#/settings']];
  root.querySelector('#hTiles').innerHTML=TILES.map(t=>
    `<a class="card" href="${t[4]}" style="display:flex;flex-direction:column;gap:8px">
      <span style="font-size:20px;color:${t[3]}">${t[2]}</span>
      <b style="font-size:14px">${t[0]}</b>
      <s style="text-decoration:none;font-size:11.5px;color:var(--dim2)">${t[1]}</s></a>`).join('');

  const cont=store.get('recent',[]);
  if(cont.length)root.querySelector('#hCont').innerHTML=
    `<div class="sec"><h2>Recently played</h2></div><div style="display:flex;gap:8px;flex-wrap:wrap">`+
    cont.map(n=>`<a class="chip" href="#/games/play/${esc(n.toLowerCase().replace(/\W+/g,'-'))}">◘ ${esc(n)}</a>`).join('')+`</div>`;

  const tick=()=>{const d=new Date(),h=d.getHours();
    root.querySelector('#hClock').textContent=d.toLocaleTimeString([],{hour12:false});
    root.querySelector('#hHi').textContent=(h<5?'Still up, ':h<12?'Good morning, ':h<18?'Good afternoon, ':'Good evening, ')+name+'.'};
  tick();const iv=setInterval(tick,1000);

  root.querySelector('#hGo').onclick=()=>{const v=root.querySelector('#hQ').value.trim();
    if(v)location.hash='#/web/'+encodeURIComponent(v)};
  root.querySelector('#hQ').onkeydown=e=>{if(e.key==='Enter')root.querySelector('#hGo').click()};

  const t0=performance.now();
  try{
    await api.vidapi('movie',1);
    const ms=Math.round(performance.now()-t0);
    root.querySelector('#hPing').textContent=ms+'ms';
    const p2=await providers();
    root.querySelector('#hStat').innerHTML=`
      <div class="kv" style="grid-template-columns:150px 1fr">
        <dt>movies index</dt><dd style="color:#4ade80">online · ${ms}ms</dd>
        <dt>anime metadata</dt><dd style="color:#4ade80">AniList · keyless</dd>
        <dt>proxy backends</dt><dd>${P.proxies.length} configured</dd>
        <dt>player servers</dt><dd>${p2.movie.length} movies · ${p2.anime.length} anime</dd>
        <dt>keys</dt><dd>${Cfg.get('tmdb')?'TMDB set':'TMDB not set'}</dd>
      </div>`;
  }catch(e){
    root.querySelector('#hPing').textContent='offline';
    root.querySelector('#hStat').innerHTML='<p class="desc">Index unreachable — players still load from their own hosts.</p>';
  }
  BG.pressure(1);
  return()=>clearInterval(iv);
}
