// Isolated service-worker lifecycle test, using Node's built-in web APIs.
// This is not a substitute for a real browser or device test.
import assert from 'node:assert/strict';
import {readFile, mkdtemp, cp, appendFile, rm} from 'node:fs/promises';
import {createHash, webcrypto} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
const root = fileURLToPath(new URL('../', import.meta.url));
const scope = 'https://example.test/WortDuell/';
const temp = await mkdtemp(path.join(tmpdir(), 'wortduell-pwa-'));
const store = new Map();
const caches = {
  async open(name) {
    if (!store.has(name)) store.set(name, new Map());
    const data = store.get(name);
    return {put: async (key, response) => data.set(key, Buffer.from(await response.arrayBuffer())),
      match: async key => data.has(key) ? new Response(data.get(key)) : undefined, keys: async () => [...data.keys()].map(url => ({url}))};
  },
  async keys() {return [...store.keys()];},
  async delete(name) {return store.delete(name);}
};
let online = true, corrupt = false;
const digest = bytes => createHash('sha256').update(Buffer.from(bytes)).digest('hex');
async function worker(folder) {
  const handlers = {};
  let skipped = false;
  const code = await readFile(path.join(folder,'sw.js'),'utf8');
  const releaseCode = await readFile(path.join(folder,'pwa-assets.js'),'utf8');
  const self = {registration:{scope}, clients:{claim:async()=>{}}, skipWaiting:async()=>{skipped=true;}, addEventListener:(name,fn)=>handlers[name]=fn};
  const context = vm.createContext({self, caches, URL, Set, Uint8Array, Response, crypto:webcrypto,
    fetch:async url=>{
      if (!online) throw new Error('Offline');
      const filename = new URL(url).pathname.slice(new URL(scope).pathname.length);
      if (corrupt && filename === 'data/catalog.json') return new Response('corrupt');
      return new Response(await readFile(path.join(folder,filename)));
    }});
  context.importScripts = () => vm.runInContext(releaseCode,context);
  vm.runInContext(code,context);
  const run = async (name, event={}) => {
    let result;
    handlers[name]({...event,waitUntil:p=>result=p,respondWith:p=>result=p});
    return await result;
  };
  const request = (url,mode='cors')=>run('fetch',{request:{url,mode,method:'GET'}});
  return {run, request, release:self.WORTDUELL_RELEASE, skipped:()=>skipped};
}
try {
  const initial = await worker(root);
  await initial.run('install'); await initial.run('activate');
  online = false;
  assert.equal(digest(await (await initial.request(scope,'navigate')).arrayBuffer()),digest(await readFile(path.join(root,'index.html'))));
  for (const asset of initial.release.assets) {
    const response = await initial.request(new URL(asset.path,scope).href);
    assert.equal(digest(await response.arrayBuffer()),asset.sha);
  }
  assert.equal(await initial.request('https://example.test/other/index.html','navigate'),undefined);
  assert.equal(await initial.request('https://example.test/WortDuell/sw.js'),undefined);
  console.log(`PASS: offline navigation + all ${initial.release.assets.length} cached resources; other paths unaffected`);
  online = true;
  const nextSource = path.join(temp,'source');
  await cp(root,nextSource,{recursive:true});
  await appendFile(path.join(nextSource,'data/A1/vocabulary/nouns.json'),'\n');
  const nextStage = path.join(temp,'staged');
  execFileSync('python3',[path.join(nextSource,'tools/prepare_pwa.py'),'--output',nextStage]);
  const next = await worker(nextStage);
  assert.notEqual(next.release.version,initial.release.version);
  corrupt=true;
  await assert.rejects(next.run('install'),/Incomplete release/);
  assert.equal(store.size,1);
  online=false; assert.equal((await initial.request(scope,'navigate')).status,200);
  console.log('PASS: JSON-only update changes version; invalid release leaves previous copy available');
  online=true; corrupt=false;
  await next.run('install');
  assert.equal(store.size,2);
  assert.equal(next.skipped(),false);
  await next.run('message',{data:{type:'WORTDUELL_ACTIVATE'}});
  assert.equal(next.skipped(),true);
  await next.run('activate');
  assert.equal(store.size,1);
  online=false;
  assert.equal(digest(await (await next.request(scope+'data/A1/vocabulary/nouns.json')).arrayBuffer()),digest(await readFile(path.join(nextStage,'data/A1/vocabulary/nouns.json'))));
  let status;
  await next.run('message',{data:{type:'WORTDUELL_STATUS'},ports:[{postMessage:value=>status=value}]});
  assert.equal(status.complete,true);
  console.log('PASS: waiting release, explicit activation, scoped cache cleanup, updated content offline');
} finally {await rm(temp,{recursive:true,force:true});}
