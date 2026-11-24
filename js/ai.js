// Independent AI panel. No writes to existing learning state or network inference.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('aiDialog'), model = $('aiModel'), level = $('aiLevel'), mode = $('aiMode');
  const load = $('aiLoad'), stop = $('aiStop'), submit = $('aiSend'), input = $('aiInput');
  const status = $('aiStatus'), progress = $('aiProgress'), log = $('aiLog'), example = $('aiExample');
  let worker = null, state = 'off', transcript = [], response = '', bubble = null, timer = null, pendingUser = null;
  const examples = {grammar:'Ich gehe gestern in die Schule.', conversation:'Hallo! Ich möchte im Café etwas bestellen.', explain:'What is the difference between weil and denn?', practice:'Give me a short exercise about Dativ.'};
  const prompts = {
    grammar:'Check the learner’s German sentence. Preserve intended meaning. If it is already correct, say so; do not invent errors. Reply with Corrected German, English translation, and a short English explanation of the specific grammar. Provide one new German example with English translation. Distinguish optional style from actual errors.',
    conversation:'Have a simple German conversation. Reply in 1–3 short German sentences, then give an English translation. If the learner makes an error, briefly correct it in English. Ask one simple German follow-up question.',
    explain:'Explain the German word, grammar concept or difference in plain English. Give two short German examples with English translations. For nouns include the article and plural if known; for prepositions mention case where useful. Do not invent rules.',
    practice:'Create one short German exercise at the requested level. Give a clear English instruction and one question, not the answer yet. If the learner answers an earlier exercise, give brief feedback and the answer, then another question.'
  };
  const multi = () => mode.value === 'conversation' || mode.value === 'practice';
  function setState(next, message) {
    state = next; status.textContent = message;
    load.disabled = next !== 'off'; model.disabled = next !== 'off';
    stop.disabled = next === 'off'; submit.disabled = next !== 'ready';
    mode.disabled = level.disabled = next === 'loading' || next === 'generating';
    progress.hidden = next !== 'loading';
  }
  function release(message = 'AI is off. Load a model to continue.') {
    clearTimeout(timer); timer = null;
    if (worker) worker.terminate(); worker = null;
    if (state === 'generating' && bubble) bubble.textContent = response + '\n[Stopped — incomplete answer]';
    response = ''; bubble = null; pendingUser = null;
    setState('off', message);
  }
  function watchdog(ms) {clearTimeout(timer); timer = setTimeout(() => release('AI stopped: no response. Reconnect or try the light model.'), ms);}
  function entry(role, text) {
    const item = document.createElement('div'); item.className = 'ai-message ai-' + role;
    const title = document.createElement('strong'); title.textContent = role === 'user' ? 'You' : 'AI tutor';
    const body = document.createElement('div'); body.textContent = text;
    item.append(title,body); log.append(item);
    while (log.children.length > 16) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight; return body;
  }
  function reset() {transcript = []; log.replaceChildren(); input.value = '';}
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-ai-open]')) return;
    if (!dialog.open) dialog.showModal();
    if (!window.isSecureContext || !navigator.gpu || !window.Worker) {
      status.textContent = 'Local AI requires HTTPS and WebGPU. Update Safari or try Chrome on Mac.';
      load.disabled = true;
    }
  });
  $('aiClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => release());
  document.addEventListener('visibilitychange', () => {if (document.hidden && worker) release('AI paused to save battery. Load again to continue.');});
  window.addEventListener('pagehide', () => {if(worker) release();});
  stop.addEventListener('click', () => release('AI stopped. Cached model files may be reused.'));
  mode.addEventListener('change', reset); level.addEventListener('change', reset);
  $('aiClear').addEventListener('click', () => {if (state === 'generating') release(); reset();});
  example.addEventListener('click', () => {input.value = examples[mode.value]; input.focus();});
  load.addEventListener('click', () => {
    if (state !== 'off') return;
    progress.value = 0; setState('loading','Starting local AI…');
    try {
      const current = new Worker(new URL('js/ai-worker.js', document.baseURI), {type:'module', name:'wortduell-ai'});
      worker = current; watchdog(180000);
      current.onerror = () => {if(worker === current) release('AI worker failed. Try an updated browser or the light model.');};
      current.onmessage = ({data:d}) => {
        if(worker !== current) return;
        if(d.type === 'progress') {watchdog(180000); progress.value = Math.max(0,Math.min(1,Number(d.progress)||0)); status.textContent = d.text || 'Preparing model…';}
        else if(d.type === 'ready') {clearTimeout(timer); setState('ready','Ready · ' + d.model);}
        else if(d.type === 'token') {watchdog(120000); response += d.text; if(bubble) bubble.textContent = response; log.scrollTop = log.scrollHeight;}
        else if(d.type === 'done') {
          clearTimeout(timer);
          if (!response.trim() && bubble) bubble.textContent = 'No answer generated. Please try again.';
          if (multi() && response.trim()) transcript = [...transcript, pendingUser, {role:'assistant',content:response}].slice(-4);
          response = ''; bubble = null; pendingUser = null; setState('ready','Ready · model loaded');
        } else if(d.type === 'error') release('AI unavailable: ' + d.message);
      };
      current.postMessage({type:'load',model:model.value});
    } catch(error) {release('AI could not start: ' + error.message);}
  });
  $('aiForm').addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim(); if(state !== 'ready' || !text || !worker) return;
    const system = 'You are WortDuell, a German–English tutor. Level: '+level.value+'. '+prompts[mode.value]+' Be concise, accurate and honest when unsure. Use German and English only.';
    const user = {role:'user',content:text.slice(0,600)};
    const messages = [{role:'system',content:system}, ...(multi()?transcript.slice(-2):[]), user];
    pendingUser = user;
    entry('user',user.content); bubble = entry('assistant','…'); response = ''; input.value = '';
    setState('generating','Generating locally…'); watchdog(120000);
    worker.postMessage({type:'generate', mode:mode.value, messages});
  });
  setState('off','AI is off. Load a model to begin.');
})();
