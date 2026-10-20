import{esc,mk,Cfg,toast,store}from'../core.js';

const MODELS=[['gpt-4o-mini','GPT-4o mini'],['gpt-4o','GPT-4o'],['claude-sonnet-4','Claude Sonnet 4'],
  ['claude-3-5-sonnet','Claude 3.5 Sonnet'],['gemini-2.0-flash','Gemini 2.0 Flash']];

export default async function(ctx){
  const root=mk('div');ctx.host.append(root);
  let mode='chat',msgs=store.get('chat',[]);

  root.innerHTML=`
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px">
      <button class="btn p" id="aiC">Chat</button><button class="btn" id="aiI">Image</button>
      <span class="sp"></span><select class="sel" id="aiM"></select>
      <button class="btn sm" id="aiClr">Clear</button>
    </div>
    <div id="aiStage"></div>`;

  const msel=root.querySelector('#aiM');
  msel.innerHTML=MODELS.map(m=>`<option value="${esc(m[0])}">${esc(m[1])}</option>`).join('');
  msel.value=Cfg.get('aiModel');
  msel.onchange=()=>Cfg.set('aiModel',msel.value);

  if(!window.puter){
    const s=document.createElement('script');s.src='https://js.puter.com/v2/';
    s.onload=()=>toast('Puter models ready','ok');document.head.append(s);
  }

  root.querySelector('#aiC').onclick=()=>{mode='chat';root.querySelector('#aiC').className='btn p';
    root.querySelector('#aiI').className='btn';render()};
  root.querySelector('#aiI').onclick=()=>{mode='img';root.querySelector('#aiI').className='btn p';
    root.querySelector('#aiC').className='btn';render()};
  root.querySelector('#aiClr').onclick=()=>{msgs=[];store.set('chat',[]);render()};

  const md=s=>esc(s)
    .replace(/```(\w*)\n([\s\S]*?)```/g,'<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
  const paintChat=()=>{const s=root.querySelector('#aiStream');
    s.innerHTML=msgs.map(m=>`<div class="msg ${m.r==='u'?'u':''}">
      <div class="av2" style="background:${m.r==='u'?'var(--accd)':'#ffffff12'};color:${m.r==='u'?'var(--acc)':'var(--dim)'}">${m.r==='u'?'you':'AI'}</div>
      <div class="bub">${md(m.c)}</div></div>`).join('');
    s.scrollTop=s.scrollHeight};

  function render(){
    const st=root.querySelector('#aiStage');
    if(mode==='img'){
      st.innerHTML=`<div class="card"><b style="font-size:13px">Image generation · Pollinations</b>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <input class="inp" id="pQ" placeholder="a neon alley at 3am, 35mm" style="flex:1;min-width:240px">
          <select class="sel" id="pR"><option value="16:9">16:9</option><option value="1:1">1:1</option><option value="9:16">9:16</option></select>
          <button class="btn p" id="pGo">Render</button></div></div>
        <div id="pOut" class="grid g4" style="margin-top:14px"></div>`;
      st.querySelector('#pGo').onclick=()=>{
        const q=st.querySelector('#pQ').value.trim();if(!q)return;
        const [w,h]=st.querySelector('#pR').value.split(':').map(Number);
        const url='https://image.pollinations.ai/prompt/'+encodeURIComponent(q)+
          '?width='+Math.round(w*720)+'&height='+Math.round(h*720)+'&seed='+Math.floor(Math.random()*99999)+'&nologo=true';
        st.querySelector('#pOut').insertAdjacentHTML('afterbegin',
          `<div class="cv" style="aspect-ratio:${w}/${h}"><img src="${url}" alt=""></div>`);
      };
      return;
    }
    st.innerHTML=`<div class="chat"><div class="stream" id="aiStream"></div>
      <div class="composer"><textarea id="aiIn" rows="1" placeholder="Ask anything…  (Shift+Enter = newline)"></textarea>
      <button class="btn p" id="aiSend">Send</button></div></div>`;
    paintChat();
    const ta=st.querySelector('#aiIn');
    ta.oninput=()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,160)+'px'};
    ta.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};
    st.querySelector('#aiSend').onclick=send;
    const ask=store.get('ask');if(ask){store.del('ask');ta.value=ask;send()}
  }

  async function send(){
    const ta=root.querySelector('#aiIn');const q=ta.value.trim();if(!q)return;
    ta.value='';ta.style.height='auto';
    msgs.push({r:'u',c:q});store.set('chat',msgs);paintChat();
    const s=root.querySelector('#aiStream');
    s.insertAdjacentHTML('beforeend','<div class="msg"><div class="av2" style="background:#ffffff12">AI</div>'+
      '<div class="bub typing"><i></i><i></i><i></i></div></div>');
    s.scrollTop=s.scrollHeight;
    let out='';
    try{
      if(window.puter&&window.puter.ai){
        const r=await puter.ai.chat(q,{model:Cfg.get('aiModel')});
        out=r&&r.message?r.message.content:(r&&r.text)||String(r);
      }else{
        const r=await fetch('https://text.pollinations.ai/openai',{method:'POST',
          headers:{'content-type':'application/json'},
          body:JSON.stringify({model:'openai',messages:[{role:'user',content:q}]})});
        const d=await r.json();out=(d.choices&&d.choices[0]&&d.choices[0].message.content)||'';
      }
    }catch(e){out='Could not reach a model: '+e.message}
    msgs.push({r:'a',c:out||'(empty)'});
    store.set('chat',msgs.slice(-40));paintChat();
  }

  render();
  return()=>{};
}
