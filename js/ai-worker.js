// Dedicated worker: no model work until an explicit Load request.
// The pinned third-party runtime and model artifacts are downloaded by the browser.
const runtimeURL = 'https://esm.run/@mlc-ai/web-llm@0.2.85';
const models = {light:'Qwen2.5-0.5B-Instruct', balanced:'Qwen2.5-1.5B-Instruct'};
let engine = null, busy = false;
const send = (type, data = {}) => self.postMessage({type, ...data});
self.onmessage = async ({data}) => {
  if (busy) return;
  busy = true;
  try {
    if (data.type === 'load') {
      if (!navigator.gpu) throw Error('WebGPU is not available in this browser worker. Try updated Safari or desktop Chrome.');
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw Error('No compatible GPU adapter.');
      const base = models[data.model];
      if (!base) throw Error('Unknown model.');
      const id = base + (adapter.features.has('shader-f16') ? '-q4f16_1-MLC' : '-q4f32_1-MLC');
      send('progress', {progress:0, text:'Loading WebLLM runtime…'});
      const {CreateMLCEngine, prebuiltAppConfig} = await import(runtimeURL);
      if (!prebuiltAppConfig.model_list.some(m => m.model_id === id)) throw Error('Model unavailable in this runtime.');
      engine = await CreateMLCEngine(id, {initProgressCallback: p => send('progress', {progress:p.progress, text:p.text})}, {context_window_size:2048});
      send('ready', {model:id});
    } else if (data.type === 'generate') {
      if (!engine) throw Error('Load the model first.');
      const chunks = await engine.chat.completions.create({messages:data.messages, stream:true, max_tokens:320, temperature:data.mode === 'grammar' ? 0.15 : 0.45, top_p:0.85});
      for await (const chunk of chunks) {
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) send('token',{text});
      }
      send('done');
    }
  } catch (error) {
    send('error', {message:String(error?.message || error).slice(0,500)});
  } finally { busy = false; }
};
