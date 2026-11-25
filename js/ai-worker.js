// Dedicated worker: no model work until an explicit Load request.
// The pinned third-party runtime and model artifacts are downloaded by the browser.
const runtimeURL = 'https://esm.run/@mlc-ai/web-llm@0.2.82';
const models = {light:'Qwen2.5-0.5B-Instruct', balanced:'Qwen2.5-1.5B-Instruct'};
let engine = null, busy = false;
const send = (type, data = {}) => self.postMessage({type, ...data});
self.onmessage = async ({data}) => {
  if (busy) return;
  busy = true;
  try {
    if (data.type === 'delete') {
      // This worker is separate from inference; deletion never requires a GPU.
      const {deleteModelAllInfoInCache, hasModelInCache, prebuiltAppConfig} = await import(runtimeURL);
      const ids = Object.values(models).flatMap(base => ['-q4f16_1-MLC','-q4f32_1-MLC'].map(suffix => base + suffix));
      const failures = [];
      for (const id of ids) {
        try {
          // Also remove partially downloaded variants, not only complete models.
          await deleteModelAllInfoInCache(id, prebuiltAppConfig);
          if (await hasModelInCache(id, prebuiltAppConfig)) throw Error('Model still in cache');
        } catch (error) { failures.push(id + ': ' + String(error?.message || error)); }
      }
      if (failures.length) throw Error('Could not verify full deletion. Retry: ' + failures.join('; '));
      send('deleted');
    } else if (data.type === 'load') {
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
      const chunks = await engine.chat.completions.create({messages:data.messages, stream:true, max_tokens:400, temperature:0.25, top_p:0.85});
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
