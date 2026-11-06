import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createApp} from '../server.mjs';

async function withServer(options, run) {
  const server=createApp(options);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {await run(base);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
const post=(base,body,headers={})=>fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('static server serves UI with correct MIME types and supports HEAD',async()=>withServer({apiKey:''},async base=>{
  const html=await fetch(base);assert.equal(html.status,200);assert.match(await html.text(),/GhostAgent/);
  const js=await fetch(base+'/generator.js');assert.match(js.headers.get('content-type'),/javascript/);
  const head=await fetch(base+'/styles.css',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
}));
test('config only reveals readiness, never credentials',async()=>withServer({apiKey:'test-secret'},async base=>{
  const response=await fetch(base+'/api/config');assert.deepEqual(await response.json(),{aiEnabled:true});
}));
test('private files, dotfiles, directories and path traversal are not served',async()=>withServer({apiKey:''},async base=>{
  for(const p of ['/.env','/.env.example','/server.mjs','/tests/server.test.mjs','/.git/config','/assets/','/%2e%2e/.env'])assert.equal((await fetch(base+p)).status,404,p);
}));
test('template mode does not make model requests',async()=>withServer({apiKey:'',fetcher:()=>{throw Error('should not call');}},async base=>{
  assert.deepEqual(await (await fetch(base+'/api/config')).json(),{aiEnabled:false});
  assert.equal((await post(base,{idea:'做一个简单的待办清单'})).status,503);
}));
test('rejects cross-origin requests and unsupported request formats',async()=>withServer({apiKey:'test'},async base=>{
  assert.equal((await post(base,{idea:'做一个简单的待办清单'},{Origin:'https://untrusted.example'})).status,403);
  assert.equal((await fetch(base+'/api/generate',{method:'POST',body:'x'})).status,415);
  assert.equal((await fetch(base+'/api/generate')).status,405);
}));
test('rejects invalid, oversized and malformed JSON input',async()=>withServer({apiKey:'test'},async base=>{
  assert.equal((await post(base,{idea:'x'})).status,400);
  assert.equal((await post(base,{idea:'x'.repeat(2001)})).status,400);
  assert.equal((await post(base,{idea:'x'.repeat(17000)})).status,413);
  assert.equal((await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
}));
test('proxy sends configured model, validates plan, and hides the secret',async()=>{
  const plan={name:'便签',summary:'记录灵感',features:['添加'],assumptions:['单设备'],risks:['无备份']};
  const calls=[];
  await withServer({apiKey:'secret',baseURL:'https://model.example/v1/',model:'test-model',fetcher:async(url,options)=>{
    calls.push({url:String(url),options});return Response.json({choices:[{message:{content:JSON.stringify(plan)}}]});
  }},async base=>{
    const response=await post(base,{idea:'做一个简单的便签工具'},{Origin:base});assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{plan});
  });
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://model.example/v1/chat/completions');
  assert.equal(calls[0].options.headers.Authorization,'Bearer secret');assert.equal(JSON.parse(calls[0].options.body).model,'test-model');
});
test('bad model responses return actionable errors without leaking response body',async()=>{
  for(const fetcher of [async()=>new Response('secret upstream body',{status:401}),async()=>Response.json({choices:[]}),async()=>Response.json({choices:[{message:{content:'{"name":42}'}}]})]) {
    await withServer({apiKey:'test',fetcher},async base=>{
      const response=await post(base,{idea:'做一个简单的便签工具'});assert.equal(response.status,502);
      const data=await response.json();assert.ok(data.error);assert.ok(!data.error.includes('secret upstream body'));
    });
  }
});
test('Host header validation rejects external hostnames',async()=>withServer({apiKey:''},async base=>{
  const status=await new Promise((resolve,reject)=>{
    const req=http.get(base,{headers:{Host:'attacker.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);
  });assert.equal(status,403);
}));
