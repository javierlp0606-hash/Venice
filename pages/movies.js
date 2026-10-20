import{embed,esc,mk,Cfg,toast,api,providers,fill,store}from'../core.js';

export default async function(ctx){
  const {host,id,sub,rest,signal}=ctx;
  const P=await providers();
  const root=mk('div');host.append(root);

  if(id==='title')return detail(sub,rest?.[0]||'movie');

  /* ---------------- browse ---------------- */
  let page=1;
  root.innerHTML=`
    <div class="cine" id="cine"><img class="bd" id="cBd" alt=""><div class="sh"></div>
      <div class="in">
        <div class="yr" id="cYr"></div>
        <h2 id="cT"></h2><p id="cD"></p>
        <div class="acts">
          <button class="play" id="cPlay">▶ Play</button>
          <button class="more" id="cInfo">ⓘ More info</button>
        </div>
      </div>
      <div class="dots" id="cDots"></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:20px;flex-wrap:wrap">
      <input class="inp" id="mQ" placeholder="Search movies, TV, or paste tt1375666 / 27205" style="max-width:440px">
      <button class="btn p" id="mGo">Search</button>
      <span class="sp"></span>
      <div class="seg" id="mKind">
        <button class="on" data-k="movie">Movies</button><button data-k="tv">TV</button>
      </div>
    </div>
    <div id="mBody"></div>`;

  let kind='movie',heroIdx=0,heroList=[],heroTimer=0;

  function setHero(list){
    heroList=list.slice(0,6);heroIdx=0;paintHero();
    clearInterval(heroTimer);heroTimer=setInterval(()=>{heroIdx=(heroIdx+1)%heroList.length;paintHero()},9000);
    root.querySelector('#cDots').innerHTML=heroList.map((_,i)=>`<i class="${i===0?'on':''}" data-i="${i}"></i>`).join('');
    root.querySelectorAll('#cDots i').forEach(d=>d.onclick=()=>{heroIdx=+d.dataset.i;paintHero()});
  }
  function paintHero(){
    const it=heroList[heroIdx];if(!it)return;
    root.querySelector('#cBd').src=it.backdrop||it.poster_url||'';
    root.querySelector('#cT').textContent=it.title;
    root.querySelector('#cYr').textContent=it.year||'';
    root.querySelector('#cD').textContent=it.overview||'';
    root.querySelectorAll('#cDots i').forEach((d,i)=>d.classList.toggle('on',i===heroIdx));
  }
  root.querySelector('#cPlay').onclick=()=>{const it=heroList[heroIdx];
    if(it)location.hash='#/movies/title/'+(it.imdb_id||it.tmdb_id)+'/'+(it.type||'movie')};
  root.querySelector('#cInfo').onclick=()=>root.querySelector('#cPlay').click();

  function pc(it,extraStyle=''){
    const a=mk('a','pc');a.href='#/movies/title/'+(it.imdb_id||it.tmdb_id)+'/'+(it.type||'movie');
    a.style.cssText=extraStyle;
    a.innerHTML=`<div class="im">
        <img loading="lazy" decoding="async" alt="${esc(it.title)}" src="${esc(it.poster_url||'')}">
        ${it.rating&&it.rating!=='0.0'?`<span class="bg">★ ${esc(it.rating)}</span>`:''}
        <span class="typ">${it.type==='tv'?'TV':'MOVIE'}</span></div>
      <b>${esc(it.title)}</b>
      <div class="sub"><span>${esc(it.year||'')}</span>${it.rating&&it.rating!=='0.0'?`<i></i><em>${esc(it.rating)}</em>`:''}</div>`;
    return a;
  }
  function strip(label,icon,items){
    const s=mk('section');
    s.innerHTML=`<div class="rh"><i>${icon}</i><h2>${esc(label)}</h2><span class="more-l">View all ›</span>
      <div class="arw"><button data-d="-1">‹</button><button data-d="1">›</button></div></div>`;
    const r=mk('div','row');items.forEach(it=>r.append(pc(it)));
    s.append(r);
    s.querySelectorAll('.arw button').forEach(b=>b.onclick=()=>r.scrollBy({left:+b.dataset.d*640,behavior:'smooth'}));
    return s;
  }

  async function browse(){
    const body=root.querySelector('#mBody');
    body.innerHTML='<div class="grid g6">'+Array(18).fill('<div class="sk" style="aspect-ratio:2/3"></div>').join('')+'</div>';
    try{
      const [a,b,c]=await Promise.all([api.vidapi('movie',1),api.vidapi('tv',1),api.vidapi('movie',2)]);
      const withArt=a.items.map(x=>({...x,backdrop:x.poster_url}));
      setHero(a.items.slice(0,6));
      body.innerHTML='';
      body.append(strip('Trending This Week','▲',a.items.slice(0,18)));
      body.append(strip('Popular Movies','▤',c.items.slice(0,18)));
      body.append(strip('TV, freshly indexed','◫',b.items.slice(0,18)));
      const more=mk('div','','<button class="btn" id="mMore">Load more</button>');
      more.style.cssText='display:grid;place-content:center;padding:30px';
      body.append(more);
      more.querySelector('#mMore').onclick=async e=>{
        e.target.disabled=true;e.target.textContent='loading…';page++;
        const d=await api.vidapi(kind,page);
        body.querySelectorAll('.row')[1].append(...d.items.map(pc));
        e.target.disabled=false;e.target.textContent='Load more';
      };
    }catch(e){body.innerHTML='<div class="empty"><b>Catalogue unreachable</b><span>'+esc(e.message)+'</span></div>'}
  }

  async function search(q){
    if(!q)return browse();
    const body=root.querySelector('#mBody');
    body.innerHTML='<div class="empty">searching…</div>';
    try{
      let list=[];
      if(Cfg.get('tmdb')){
        const d=await api.tmdb('/search/multi',{query:q,include_adult:'false'},signal);
        list=d.results.filter(r=>r.media_type!=='person').map(r=>({
          tmdb_id:r.id,imdb_id:r.id,title:r.title||r.name,
          year:(r.release_date||r.first_air_date||'').slice(0,4),
          poster_url:r.poster_path?'https://image.tmdb.org/t/p/w342'+r.poster_path:'',
          rating:(r.vote_average||0).toFixed(1),type:r.media_type}));
      }else{
        const d=await api.imdb(q,signal);
        list=d.map(r=>({imdb_id:r.id,tmdb_id:r.id,title:r.title,year:r.year,poster_url:r.poster,rating:'',type:'movie'}));
      }
      if(!list.length)throw new Error('nothing found');
      body.innerHTML=`<div class="rh"><i>⌕</i><h2>Results for “${esc(q)}”</h2><span class="more-l">${list.length}</span></div>`;
      const g=mk('div','grid g6');list.forEach(it=>g.append(pc(it)));body.append(g);
    }catch(e){
      body.innerHTML=`<div class="empty"><b>No results</b><span>${esc(e.message)}</span>
        <p style="max-width:44ch;font-size:12.5px">Add a free TMDB key in Settings for full search, or open an ID directly —
        <code>#/movies/title/tt1375666/movie</code></p></div>`;
    }
  }

  root.querySelector('#mGo').onclick=()=>search(root.querySelector('#mQ').value.trim());
  root.querySelector('#mQ').onkeydown=e=>{if(e.key==='Enter')search(e.target.value.trim())};
  root.querySelectorAll('#mKind button').forEach(b=>b.onclick=()=>{
    root.querySelectorAll('#mKind button').forEach(x=>x.classList.toggle('on',x===b));kind=b.dataset.k;browse()});
  browse();
  return()=>clearInterval(heroTimer);

  /* ---------------- detail (123movies grammar) ---------------- */
  async function detail(mid,type){
    root.innerHTML='<div class="mcol"><div class="sk" style="height:380px"></div></div>';
    const isTv=type==='tv';
    let meta=null;
    try{
      if(Cfg.get('tmdb'))meta=await api.tmdb('/'+ (isTv?'tv':'movie') +'/'+mid,{append_to_response:'credits,recommendations'},signal);
    }catch(_){}
    const title=meta?(meta.title||meta.name):mid;
    const year=(meta?.release_date||meta?.first_air_date||'').slice(0,4);
    const post=meta?.poster_path?'https://image.tmdb.org/t/p/w500'+meta.poster_path:'';
    const back=meta?.backdrop_path?'https://image.tmdb.org/t/p/w1280'+meta.backdrop_path:post;
    const rating=meta?.vote_average?meta.vote_average.toFixed(1):'';
    const cast=(meta?.credits?.cast||[]).slice(0,4).map(c=>c.name).join(', ');
    const dir=meta?.credits?.crew?.find(c=>c.job==='Director')?.name||'';

    root.innerHTML=`
      <div class="mcol">
        <div class="crumb"><a href="#/movies">Home</a><span>/</span><a href="#/movies">Movies</a><span>/</span>${esc(title)}</div>
        <div id="mPlayer"></div>
        <div class="mbox">
          <div class="pl">
            <div class="im">${post?`<img src="${esc(post)}" alt="">`:'<div class="sk" style="height:100%"></div>'}</div>
            <button id="mWatch">▶ Watch Now</button>
            <button class="gh" id="mDl">⤓ Download</button>
          </div>
          <div>
            <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">
              <h2>${esc(title)}</h2>
              ${rating?`<span class="imdb">IMDb ${esc(rating)}</span>`:''}
            </div>
            <p style="color:#c8c8d2;font-size:13.5px;margin:10px 0 0;max-width:62ch">
              ${esc(meta?.overview||'Metadata is limited without a TMDB key — playback still works from every server below.')}</p>
            <dl class="mtab">
              <div><dt>Genre</dt><dd>${esc((meta?.genres||[]).map(g=>g.name).join(', ')||'—')}</dd></div>
              <div><dt>Actors</dt><dd>${esc(cast||'—')}</dd></div>
              <div><dt>Country</dt><dd>${esc((meta?.production_countries||[]).map(c=>c.name).join(', ')||'—')}</dd></div>
              <div><dt>Director</dt><dd>${esc(dir||'—')}</dd></div>
              <div><dt>Runtime</dt><dd>${meta?.runtime?meta.runtime+' min':'—'}</dd></div>
              <div><dt>Release</dt><dd>${esc(year||'—')}</dd></div>
              <div><dt>Seasons</dt><dd>${isTv?(meta?.number_of_seasons||'—'):'—'}</dd></div>
              <div><dt>Quality</dt><dd>HD · 1080p</dd></div>
            </dl>
            ${isTv?`<div style="display:flex;gap:8px;margin-top:16px;max-width:280px">
              <input class="inp" id="mS" type="number" min="1" value="1" placeholder="Season">
              <input class="inp" id="mE" type="number" min="1" value="1" placeholder="Episode"></div>`:''}
          </div>
        </div>
        <div class="pills" id="mSrv"></div>
        <div class="rh"><i>✦</i><h2>More Like This</h2></div>
        <div class="more-grid" id="mRec"></div>
      </div>`;

    const srv=root.querySelector('#mSrv');
    srv.innerHTML=P.movie.map((p,i)=>`<span class="pill-s" data-i="${i}">${esc(p.name)}</span>`).join('');
    srv.querySelectorAll('.pill-s').forEach(s=>s.onclick=()=>{Cfg.set('mprov',+s.dataset.i);play()});

    function play(){
      const i=Cfg.get('mprov')||0,p=P.movie[i];
      srv.querySelectorAll('.pill-s').forEach(s=>s.classList.toggle('on',+s.dataset.i===i));
      const v={id:mid,s:root.querySelector('#mS')?.value||1,e:root.querySelector('#mE')?.value||1};
      embed(root.querySelector('#mPlayer'),fill(isTv?p.tv:p.movie,v),{ratio:'r16',title});
      if(p.note)toast(p.note);
      store.set('prog.m.'+mid,{t:Date.now(),title,poster:post,type});
    }
    root.querySelector('#mWatch').onclick=()=>{play();root.querySelector('#mPlayer').scrollIntoView({behavior:'smooth',block:'center'})};
    root.querySelector('#mDl').onclick=()=>{const p=P.movie[Cfg.get('mprov')||0];
      window.open(fill(isTv?p.tv:p.movie,{id:mid,s:1,e:1}),'_blank','noopener')};

    if(meta?.recommendations?.results?.length){
      root.querySelector('#mRec').innerHTML=meta.recommendations.results.slice(0,12).map(r=>
        `<a class="pc" href="#/movies/title/${r.id}/${r.media_type||(isTv?'tv':'movie')}">
          <div class="im"><img loading="lazy" src="${r.poster_path?'https://image.tmdb.org/t/p/w342'+r.poster_path:''}" alt="">
          ${r.vote_average?`<span class="rating-c">★ ${r.vote_average.toFixed(1)}</span>`:''}</div>
          <b>${esc(r.title||r.name)}</b><div class="sub"><span>${esc((r.release_date||r.first_air_date||'').slice(0,4))}</span></div></a>`).join('');
    }else{
      try{
        const d=await api.vidapi('movie',1+Math.floor(Math.random()*5));
        root.querySelector('#mRec').innerHTML=d.items.slice(0,12).map(r=>
          `<a class="pc" href="#/movies/title/${r.imdb_id||r.tmdb_id}/movie">
            <div class="im"><img loading="lazy" src="${esc(r.poster_url)}" alt="">
            ${r.rating&&r.rating!=='0.0'?`<span class="rating-c">★ ${esc(r.rating)}</span>`:''}</div>
            <b>${esc(r.title)}</b><div class="sub"><span>${esc(r.year||'')}</span></div></a>`).join('');
      }catch(_){}
    }
    play();
    return()=>{};
  }
}
