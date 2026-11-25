// Always-available, non-modal chat. No study-state changes or cloud inference.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const panel = $('aiDialog'), launcher = $('aiLauncher'), load = $('aiLoad'), stop = $('aiStop'), submit = $('aiSend'), input = $('aiInput');
  const status = $('aiStatus'), progress = $('aiProgress'), log = $('aiLog'), setup = $('aiSetup');
  const storageStatus = $('aiStorageStatus'), storageProgress = $('aiStorageProgress');
  const storageDownload = $('aiStorageDownload'), storageUnload = $('aiStorageUnload'), storageDelete = $('aiStorageDelete');
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '') || ((navigator.maxTouchPoints || 0) > 1 && /Mac/i.test(navigator.platform || ''));
  const model = mobile ? 'light' : 'balanced';
  $('aiStorageModel').textContent = mobile ? 'Qwen2.5 0.5B · automatically selected for this device' : 'Qwen2.5 1.5B · automatically selected for this device';
  const cacheKey = 'wortduell.ai.loaded.' + model;
  let installed = false;
  try {installed = localStorage.getItem(cacheKey) === '1';} catch (_) {}
  let worker = null, state = 'off', transcript = [], response = '', bubble = null, timer = null, pending = null;
  const system = 'You are WortDuell, a friendly, accurate German language tutor for an English-speaking learner, usually A1–A2. Answer the actual question directly without asking the learner to choose an activity. Explain vocabulary, translations, articles, case (Nominativ, Akkusativ, Dativ, Genitiv), word order, verb forms and grammar. If asked why a form is used, explain the precise reason in its context and contrast relevant forms, e.g. dem versus den; do not guess if the sentence is missing. Use clear English by default, German examples with English translations, and if explicitly asked for Turkish or another language use it if able. Correct mistakes only when relevant. Follow the conversation and answer follow-up questions. Keep replies concise, accurate, and appropriate to the learner. Admit uncertainty rather than inventing rules.';
  function supported(){return Boolean(window.isSecureContext && navigator.gpu && window.Worker);}
  function setState(next,message){
    state=next;status.textContent=message;
    const busy=next==='loading'||next==='generating'||next==='deleting';
    storageDownload.disabled=!supported()||next!=='off';
    storageUnload.disabled=next==='off'||next==='deleting';
    storageDelete.disabled=next==='deleting'||!window.isSecureContext||!window.Worker;
    storageProgress.hidden=next!=='loading';
    storageStatus.textContent=message;
    if(next==='off'&&installed)storageStatus.textContent+=' · Previously downloaded (browser may evict cached files).';
    setup.hidden=installed||next!=='off';load.disabled=!supported()||next!=='off';
    stop.hidden=next==='off'||next==='deleting';stop.textContent=next==='ready'?'Release':'Stop';
    submit.disabled=!supported()||busy||(!installed&&next==='off');progress.hidden=next!=='loading';
    input.disabled=next==='generating'||next==='deleting';
  }
  function watchdog(ms){clearTimeout(timer);timer=setTimeout(()=>release('AI stopped: no response. Please try again.'),ms);}
  function release(message='AI is sleeping. Send a question to wake it.'){
    clearTimeout(timer);timer=null;if(worker)worker.terminate();worker=null;
    if(pending&&bubble)bubble.textContent=(response?response+'\n':'')+'[Stopped — send your question again.]';
    response='';bubble=null;pending=null;
    setState('off',installed?message:message==='AI is sleeping. Send a question to wake it.'?'Download the AI model to begin.':message);
  }
  function entry(role,text){
    const welcome=log.querySelector('.ai-welcome');if(welcome)welcome.remove();
    const item=document.createElement('div');item.className='ai-message ai-'+role;
    const title=document.createElement('strong');title.textContent=role==='user'?'You':'AI tutor';
    const body=document.createElement('div');body.textContent=text;item.append(title,body);log.append(item);
    while(log.children.length>30)log.firstElementChild.remove();log.scrollTop=log.scrollHeight;return body;
  }
  function generate(){
    if(!pending||!worker||state!=='ready')return;
    response='';bubble.textContent='…';setState('generating','Thinking on this device…');watchdog(120000);
    // Keep the prompt within the 2k context window, including follow-up history.
    const history=[];let remaining=Math.max(0,1900-pending.content.length);
    for(let i=transcript.length-2;i>=0&&history.length<4;i-=2){
      const pair=transcript.slice(i,i+2), size=pair.reduce((n,m)=>n+m.content.length,0);
      if(size>remaining)break;history.unshift(...pair);remaining-=size;
    }
    worker.postMessage({type:'generate',messages:[{role:'system',content:system},...history,pending]});
  }
  function start(){
    if(state!=='off'||!supported())return;
    progress.value=0;storageProgress.value=0;setState('loading','Preparing local AI…');
    try{
      const current=new Worker(new URL('js/ai-worker.js',document.baseURI),{type:'module',name:'wortduell-ai'});
      worker=current;watchdog(180000);
      current.onerror=()=>{if(worker===current)release('AI worker failed. Check WebGPU support and try again.');};
      current.onmessage=({data:d})=>{
        if(worker!==current)return;
        if(d.type==='progress'){watchdog(180000);progress.value=Math.max(0,Math.min(1,Number(d.progress)||0));status.textContent=d.text||'Preparing model…';storageStatus.textContent=status.textContent;storageProgress.value=progress.value;}
        else if(d.type==='ready'){
          clearTimeout(timer);installed=true;try{localStorage.setItem(cacheKey,'1');}catch(_){}
          setState('ready','Ready · local AI');if(pending)generate();
        }else if(d.type==='token'){watchdog(120000);response+=d.text;if(bubble)bubble.textContent=response;log.scrollTop=log.scrollHeight;}
        else if(d.type==='done'){
          clearTimeout(timer);if(response.trim()&&pending)transcript=[...transcript,pending,{role:'assistant',content:response}].slice(-8);
          else if(bubble)bubble.textContent='No answer generated. Please try again.';
          pending=null;response='';bubble=null;setState('ready','Ready · local AI');
        }else if(d.type==='error')release('AI unavailable: '+d.message);
      };
      current.postMessage({type:'load',model});
    }catch(error){release('AI could not start: '+error.message);}
  }
  function open(){panel.hidden=false;launcher.hidden=true;launcher.setAttribute('aria-expanded','true');if(!supported()&&state==='off')setState('off','Local AI requires HTTPS and WebGPU in a supported browser.');}
  function close(){panel.hidden=true;launcher.hidden=false;launcher.setAttribute('aria-expanded','false');if(worker&&state!=='deleting')release();}
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-ai-open]'))open();
    const example=event.target.closest('[data-ai-example]');if(example){input.value=example.dataset.aiExample;input.focus();}
  });
  $('aiClose').addEventListener('click',close);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)close();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&worker&&state!=='deleting')release();});
  window.addEventListener('pagehide',()=>{if(worker)release();});
  stop.addEventListener('click',()=>release());load.addEventListener('click',start);
  storageDownload.addEventListener('click',start);
  storageUnload.addEventListener('click',()=>release('AI unloaded. Downloaded files are kept.'));
  storageDelete.addEventListener('click',()=>{
    if(state==='deleting'||storageDelete.disabled)return;
    if(!window.confirm('Delete downloaded WortDuell AI models on this device? Learning progress and chat history will be kept.'))return;
    release();
    setState('deleting','Deleting cached AI models…');
    try {
      const current=new Worker(new URL('js/ai-worker.js',document.baseURI),{type:'module',name:'wortduell-ai-storage'});
      worker=current;
      clearTimeout(timer);timer=setTimeout(()=>release('Model deletion timed out. Retry online.'),120000);
      current.onerror=()=>{if(worker===current)release('Model deletion failed. Retry online.');};
      current.onmessage=({data:d})=>{
        if(worker!==current)return;
        if(d.type==='deleted'){
          installed=false;
          try{for(const kind of ['light','balanced'])localStorage.removeItem('wortduell.ai.loaded.'+kind);}catch(_){}
          release('AI model files deleted. Download again to use AI.');
        } else if(d.type==='error')release('Deletion not confirmed: '+d.message);
      };
      current.postMessage({type:'delete'});
    } catch(error){release('Model deletion failed: '+error.message);}
  });
  $('aiClear').addEventListener('click',()=>{if(pending||state==='loading')release();transcript=[];log.replaceChildren();input.value='';});
  $('aiForm').addEventListener('submit',event=>{
    event.preventDefault();const text=input.value.trim();if(!text||!supported()||state==='loading'||state==='generating'||state==='deleting')return;
    if(!installed&&state==='off'){status.textContent='Download AI model first, then send your question.';return;}
    pending={role:'user',content:text.slice(0,1000)};entry('user',pending.content);bubble=entry('assistant','Preparing AI…');input.value='';
    if(state==='ready')generate();else start();
  });
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(!submit.disabled)$('aiForm').requestSubmit();}});
  setState('off',supported()?(installed?'Send a question to start the local AI.':'Download the AI model to begin.'):'Local AI requires HTTPS and WebGPU in a supported browser.');
})();
