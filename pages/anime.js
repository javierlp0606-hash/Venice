import{embed,esc,mk,Cfg,toast,api,providers,fill,store}from'../core.js';

const F='id idMal title{romaji english native} coverImage{large extraLarge} bannerImage averageScore popularity favourites episodes duration format status seasonYear genres';
const Q_T=`query($p:Int,$sort:[MediaSort],$fmt:MediaFormat,$g:String){Page(page:1,perPage:$p){media(type:ANIME,sort:$sort,format:$fmt,genre:$g,isAdult:false){${F}}}}`;
const Q_S=`query($p:Int,$s:String){Page(page:1,perPage:$p){media(type:ANIME,search:$s,isAdult:false){${F}}}}`;
const Q_O=`query($id:Int){Media(id:$id,type:ANIME){${F} description(asHtml:false) startDate{year month day} endDate{year month day}
  studios(isMain:true){nodes{name}} tags{name rank} streamingEpisodes{title thumbnail}
  relations{edges{relationType node{id title{romaji} coverImage{large} format}}}
  recommendations(perPage:14,sort:RATING_DESC){nodes{mediaRecommendation{id title{romaji} coverImage{large} averageScore}}}}}`;

export default async function(ctx){
  const {host,id,sub,rest,signal}=ctx;
  const P=await providers();
  const root=mk('div');host.append(root);
  const ttl=m=>m.title.english||m.title.romaji;

  if(id==='title')return detail(sub);
  if(id==='watch')return detail(sub,{autoEp:+rest?.[0]||1});

  /* ---------------- browse ---------------- */
  let heroIdx=0,hero=[],timer=0;
  root.innerHTML=`
    <div class="cine ani" id="ah"><img class="bd" id="aBd" alt=""><div class="sh"></div>
      <div class="in">
        <h2 id="aT"></h2>
        <div class="badges" id="aB"></div>
        <p id="aD"></p>
        <div class="acts">
          <button class="play" id="aPlay">▶ Play</button>
          <button class="round" id="aAdd" title="Add to list">＋</button>
          <button class="round" title="Random">⟳</button>
        </div>
      </div>
      <div class="dots" id="aDots"></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:20px">
      <input class="inp" id="aQ" placeholder="Search a series…" style="max-width:420px">
      <button class="btn p" id="aGo">Search</button>
      <span class="sp"></span>
      <span class="chip">AniList · AniZip · keyless</span>
    </div>
    <div id="aBody"></div>`;

  function pc(m){
    const a=mk('a','pc');a.href='#/anime/title/'+m.id;
    const g=(m.genres||[]).slice(0,2).join(' · ');
    a.innerHTML=`<div class="im"><img loading="lazy" decoding="async" alt="${esc(ttl(m))}" src="${esc(m.coverImage.extraLarge||m.coverImage.large)}">
        ${m.averageScore?`<span class="bg an">◆ ${m.averageScore}</span>`:''}
        <span class="typ">${esc((m.format||'').replace(/_/g,' ')||'ANIME')}</span></div>
      <b>${esc(ttl(m))}</b>
      <div class="sub"><span>${esc(m.seasonYear||'')}</span>${g?`<i></i><span>${esc(g)}</span>`:''}
        ${m.averageScore?`<i></i><em>★ ${(m.averageScore/10).toFixed(1)}</em>`:''}</div>`;
    return a;
  }
  function strip(label,icon,items){
    const s=mk('section');
    s.innerHTML=`<div class="rh"><i>${icon}</i><h2>${esc(label)}</h2><span class="more-l">View all ›</span>
      <div class="arw"><button data-d="-1">‹</button><button data-d="1">›</button></div></div>`;
    const r=mk('div','row');items.forEach(m=>r.append(pc(m)));s.append(r);
    s.querySelectorAll('.arw button').forEach(b=>b.onclick=()=>r.scrollBy({left:+b.dataset.d*640,behavior:'smooth'}));
    return s;
  }
  function setHero(list){
    hero=list.slice(0,5);heroIdx=0;paintHero();
    clearInterval(timer);timer=setInterval(()=>{heroIdx=(heroIdx+1)%hero.length;paintHero()},9000);
    root.querySelector('#aDots').innerHTML=hero.map((_,i)=>`<i class="${i?'':'on'}"></i>`).join('');
  }
  function paintHero(){
    const m=hero[heroIdx];if(!m)return;
    root.querySelector('#aBd').src=m.bannerImage||m.coverImage.extraLarge;
    root.querySelector('#aT').textContent=ttl(m);
    root.querySelector('#aB').innerHTML=[
      m.averageScore?`<span class="badge r">★ ${(m.averageScore/10).toFixed(1)}</span>`:'',
      m.episodes?`<span class="badge">${m.episodes} Episodes</span>`:'',
      m.format?`<span class="badge">${esc(m.format.replace(/_/g,' '))}</span>`:'',
      ...(m.genres||[]).slice(0,3).map(g=>`<span class="badge">${esc(g)}</span>`)].join('');
    root.querySelector('#aD').textContent=(m.description||'').replace(/<[^>]+>/g,'')||'';
    root.querySelectorAll('#aDots i').forEach((d,i)=>d.classList.toggle('on',i===heroIdx));
  }
  root.querySelector('#aPlay').onclick=()=>{if(hero[heroIdx])location.hash='#/anime/title/'+hero[heroIdx].id};
  root.querySelector('#aAdd').onclick=()=>{
    const m=hero[heroIdx];if(!m)return;const l=store.get('list',[]);
    if(!l.includes(m.id))l.unshift(m.id);store.set('list',l.slice(0,60));toast('Added to your list','ok')};
  root.querySelectorAll('.round')[1].onclick=()=>location.hash='#/anime/title/'+(1+Math.floor(Math.random()*17000));

  async function browse(){
    const body=root.querySelector('#aBody');
    body.innerHTML='<div class="grid g6">'+Array(18).fill('<div class="sk" style="aspect-ratio:2/3"></div>').join('')+'</div>';
    try{
      const [w,mo,ro,nw]=await Promise.all([
        api.anilist(Q_T,{p:18,sort:['TRENDING_DESC']},signal),
        api.anilist(Q_T,{p:18,sort:['POPULARITY_DESC'],fmt:'MOVIE'},signal),
        api.anilist(Q_T,{p:18,sort:['POPULARITY_DESC'],g:'Romance'},signal),
        api.anilist(Q_T,{p:18,sort:['START_DATE_DESC']},signal)]);
      setHero(w.Page.media.slice(0,5));
      body.innerHTML='';
      body.append(strip('Top Weekly','▲',w.Page.media));
      body.append(strip('Top Weekly Movies','▤',mo.Page.media));
      body.append(strip('Top Romance','♡',ro.Page.media));
      body.append(strip('New Releases','✦',nw.Page.media));
    }catch(e){body.innerHTML='<div class="empty"><b>AniList unreachable</b><span>'+esc(e.message)+'</span></div>'}
  }
  async function search(q){
    if(!q)return browse();
    const body=root.querySelector('#aBody');
    body.innerHTML='<div class="empty">searching…</div>';
    try{
      const d=await api.anilist(Q_S,{p:36,s:q},signal);
      body.innerHTML=`<div class="rh"><i>⌕</i><h2>“${esc(q)}”</h2><span class="more-l">${d.Page.media.length}</span></div>`;
      const g=mk('div','grid g6');d.Page.media.forEach(m=>g.append(pc(m)));body.append(g);
    }catch(e){body.innerHTML='<div class="empty"><b>No matches</b><span>'+esc(e.message)+'</span></div>'}
  }
  root.querySelector('#aGo').onclick=()=>search(root.querySelector('#aQ').value.trim());
  root.querySelector('#aQ').onkeydown=e=>{if(e.key==='Enter')search(e.target.value.trim())};
  browse();
  return()=>clearInterval(timer);

  /* ---------------- detail ---------------- */
  async function detail(aid,opt={}){
    root.innerHTML='<div class="sk" style="height:320px"></div>';
    let m;
    try{m=(await api.anilist(Q_O,{id:+aid},signal)).Media}
    catch(e){root.innerHTML='<div class="empty"><b>Could not load</b><span>'+esc(e.message)+'</span></div>';return}

    let epsMeta={};
    try{
      const az=await api.raw('https://api.ani.zip/mappings?anilist_id='+m.id);
      epsMeta=az.episodes||{};
    }catch(_){}

    const total=m.episodes||Object.keys(epsMeta).length||m.streamingEpisodes?.length||12;
    const prog=store.get('prog.a.'+m.id,{ep:1,lang:'sub'});
    let ep=Math.min(opt.autoEp||prog.ep||1,total),lang=prog.lang||'sub',tab='eps';
    const st=m.streamingEpisodes||[];
    const d=(x)=>x?[x.year,x.month,x.day].filter(Boolean).join('-'):'';

    root.innerHTML=`
      <a class="lk" href="#/anime" style="font-size:12px">←</a>
      <div class="adetail" style="margin-top:10px">
        <aside>
          <div class="rail-card">
            <div class="im"><img src="${esc(m.coverImage.extraLarge||m.coverImage.large)}" alt=""></div>
            <div class="statlist">
              <div class="r"><b>Format</b><span>${esc((m.format||'TV').replace(/_/g,' '))}</span></div>
              <div class="r"><b>Episodes</b><span>${total}</span></div>
              <div class="r"><b>Duration</b><span>${m.duration?m.duration+' min per episode':'—'}</span></div>
              <div class="r"><b>Aired</b><span>${esc(d(m.startDate)||'—')}${m.endDate?' – '+esc(d(m.endDate)):''}</span></div>
              <div class="r"><b>Score</b><span style="color:#c79bff">◆ ${m.averageScore?(m.averageScore/10).toFixed(1):'—'}</span></div>
              <div class="r"><b>Views</b><span>${(m.popularity||0).toLocaleString()}</span></div>
              <div class="r"><b>Favourites</b><span>${(m.favourites||0).toLocaleString()}</span></div>
              <div class="r"><b>Studio</b><span>${esc((m.studios?.nodes||[]).map(s=>s.name).join(', ')||'—')}</span></div>
              <div class="r"><b>Season</b><span>${esc((m.season||'')+' '+(m.seasonYear||''))||'—'}</span></div>
              <div class="r"><b>Status</b><span>${esc((m.status||'').replace(/_/g,' '))}</span></div>
              <div class="r"><b>Audio</b><span>Sub / Dub</span></div>
              <div class="r"><b>MAL</b><span>${m.idMal||'—'}</span></div>
            </div>
            ${(m.tags||[]).length?`<div class="tagrow">${m.tags.slice(0,7).map(t=>`<span class="chip">${esc(t.name)}</span>`).join('')}</div>`:''}
          </div>
        </aside>
        <div style="min-width:0">
          <h2 class="script">${esc(ttl(m))}</h2>
          <div class="badges" style="margin-top:12px">
            ${m.averageScore?`<span class="badge r">★ ${(m.averageScore/10).toFixed(1)}</span>`:''}
            ${m.seasonYear?`<span class="badge">${m.seasonYear}</span>`:''}
            <span class="badge">${total} Episodes</span>
            <span class="badge">${esc((m.format||'').replace(/_/g,' '))}</span>
            ${(m.genres||[]).slice(0,4).map(g=>`<span class="badge">${esc(g)}</span>`).join('')}
          </div>
          <p class="desc" id="aSyn">${esc((m.description||'').replace(/<[^>]+>/g,'').slice(0,260))}…</p>
          <div class="acts">
            <button class="play" id="aWatch" style="background:var(--acc);color:#08080b;border:0;border-radius:11px;padding:11px 22px;font-weight:650;cursor:pointer">▶ Watch now</button>
            <button class="round" id="aAdd2">＋</button>
            <button class="round" id="aRand2">⟳</button>
            <button class="round" title="Share">↗</button>
            <button class="round" title="Source">ⓘ</button>
            <button class="round" id="aList">☆</button>
          </div>
          <div class="pstage" id="aStage"></div>
          <div class="tabs" id="aTabs">
            <button class="tab on" data-t="eps">≡ Episodes <span class="n">${total}</span></button>
            <button class="tab" data-t="rel">⧉ Related <span class="n">${m.relations?.edges?.length||0}</span></button>
            <button class="tab" data-t="rec">✦ More like this <span class="n">${m.recommendations?.nodes?.length||0}</span></button>
            <button class="tab" data-t="dl">⤓ Downloads</button>
          </div>
          <div id="aTabBody"></div>
        </div>
      </div>`;

    root.querySelector('#aAdd2').onclick=()=>{const l=store.get('list',[]);
      if(!l.includes(m.id))l.unshift(m.id);store.set('list',l.slice(0,60));toast('Added','ok')};
    root.querySelector('#aRand2').onclick=()=>location.hash='#/anime/title/'+(1+Math.floor(Math.random()*17000));
    root.querySelector('#aList').onclick=()=>location.hash='#/profile';
    root.querySelector('#aWatch').onclick=()=>{
      play();root.querySelector('#aStage').scrollIntoView({behavior:'smooth',block:'center'})};

    root.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
      root.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===t));tab=t.dataset.t;body()});

    function play(){
      const p=P.anime[Cfg.get('aprov')||0];
      const url=fill(p.url,{id:m.id,ep,lang,dub:lang==='dub'?'true':'false'});
      const st2=root.querySelector('#aStage');
      const fr=embed(st2,url,{ratio:'r16',title:ttl(m)+' · ep '+ep});
      fr.style.setProperty('--acc','#b06bff');
      store.set('prog.a.'+m.id,{ep,lang,t:Date.now(),title:ttl(m),poster:m.coverImage.large});
    }
    function epRows(){
      const list=Array.from({length:total},(_,i)=>{
        const n=i+1,meta=epsMeta[String(n)]||{};
        const img=meta.image||st[i]?.thumbnail||'';
        const name=(typeof meta.title==='object'?(meta.title.en||Object.values(meta.title)[0]):meta.title)||st[i]?.title||('Episode '+n);
        const ov=meta.overview||'';
        const dur=meta.runtime?`${meta.runtime}:00`:'24:00';
        const air=meta.airDate?new Date(meta.airDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
        return `<div class="epi${n===ep?' on':''}" data-e="${n}">
          <div class="th">${img?`<img loading="lazy" src="${esc(img)}" alt="">`:''}<span class="dub">DUB</span></div>
          <div class="tx"><b>Episode ${n} · ${esc(name)}</b><p>${esc(ov)}</p>
            <div class="ft"><span>▶</span><span class="dur">${dur}</span>${air?`<span>${esc(air)}</span>`:''}</div></div></div>`;
      });
      return `<div class="epctrl">
          <input class="inp" id="epQ" placeholder="⌕ Search episodes">
          <div class="seg" id="epSort"><button class="on">⇅ Oldest</button><button>Newest</button></div>
          <div class="seg" id="epLang">
            <button class="${lang==='sub'?'on':''}" data-l="sub">Sub only <span>${total}</span></button>
            <button class="${lang==='dub'?'on':''}" data-l="dub">Dub only</button>
          </div>
          <select class="sel" id="epSrv">${P.anime.map((p,i)=>`<option value="${i}" ${i===(Cfg.get('aprov')||0)?'selected':''}>${esc(p.name)}</option>`).join('')}</select>
        </div><div class="epgrid">${list.join('')}</div>`;
    }
    function body(){
      const b=root.querySelector('#aTabBody');
      if(tab==='eps'){
        b.innerHTML=epRows();
        b.querySelectorAll('.epi').forEach(e=>e.onclick=()=>{
          ep=+e.dataset.e;store.set('prog.a.'+m.id,{ep,lang});body();play()});
        b.querySelector('#epSrv').onchange=e=>{Cfg.set('aprov',+e.target.value);play()};
        b.querySelectorAll('#epLang button').forEach(x=>x.onclick=()=>{
          lang=x.dataset.l;store.set('prog.a.'+m.id,{ep,lang});body();play()});
        b.querySelector('#epQ').oninput=e=>{
          const q=e.target.value.toLowerCase();
          b.querySelectorAll('.epi').forEach(el=>el.style.display=
            el.textContent.toLowerCase().includes(q)?'':'none')};
      }else if(tab==='rel'){
        const ed=(m.relations?.edges||[]).filter(x=>x.node);
        b.innerHTML=ed.length?`<div class="grid g6">${ed.map(x=>
          `<a class="pc" href="#/anime/title/${x.node.id}"><div class="im">
            <img loading="lazy" src="${esc(x.node.coverImage?.large||'')}" alt=""><span class="typ">${esc(x.relationType.replace(/_/g,' '))}</span></div>
            <b>${esc(x.node.title.romaji)}</b><div class="sub"><span>${esc(x.node.format||'')}</span></div></a>`).join('')}</div>`
          :'<div class="empty">No relations listed.</div>';
      }else if(tab==='rec'){
        const rn=(m.recommendations?.nodes||[]).filter(n=>n.mediaRecommendation);
        b.innerHTML=rn.length?`<div class="grid g6">${rn.map(n=>{const r=n.mediaRecommendation;
          return `<a class="pc" href="#/anime/title/${r.id}"><div class="im">
            <img loading="lazy" src="${esc(r.coverImage.large)}" alt="">
            ${r.averageScore?`<span class="bg an">◆ ${r.averageScore}</span>`:''}</div>
            <b>${esc(r.title.romaji)}</b><div class="sub"><span>${r.averageScore?('★ '+(r.averageScore/10).toFixed(1)):''}</span></div></a>`}).join('')}</div>`
          :'<div class="empty">Nothing yet.</div>';
      }else{
        b.innerHTML=`<div class="card"><p class="desc">Streams resolve inside the player. Use the server dropdown above the episode grid —
          <b>${esc(P.anime.map(p=>p.name).join(', '))}</b>. MegaPlay exposes auto-next and watch-progress events; the shell hooks them for you.</p></div>`;
      }
    }

    const onMsg=e=>{
      let d=e.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch{return}}
      if(d&&d.event==='complete'&&Cfg.get('autoNext')&&ep<total){ep++;body();play()}
    };
    addEventListener('message',onMsg);

    body();play();
    return()=>removeEventListener('message',onMsg);
  }
}
