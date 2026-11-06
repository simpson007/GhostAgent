import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {EXAMPLES,normalizeIdea,analyzeIdea,createProject,projectFiles,validateAIPlan,escapeHtml} from '../generator.js';
import {crc32,zipFiles} from '../zip.js';

test('rejects empty, short, wrong-type and oversized input',()=>{
  for(const bad of ['', ' hi ', null, {}, 'x'.repeat(2001)])assert.throws(()=>normalizeIdea(bad));
  assert.equal(normalizeIdea('  一个简单的项目  '),'一个简单的项目');
});
for(const kind of ['todo','notes','habit'])test(`${kind} produces specs, executable JS, and complete project files`,()=>{
  const project=createProject({idea:EXAMPLES[kind]});
  assert.equal(project.kind,kind);assert.equal(project.mode,'template');assert.ok(project.id);
  for(const key of ['requirements','design','tasks'])assert.ok(project.documents[key].startsWith('# '));
  assert.ok(project.documents.requirements.includes(EXAMPLES[kind]));
  const script=project.code.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(()=>new vm.Script(script));
  const files=projectFiles(project);assert.equal(Object.keys(files).length,6);
  assert.ok(files['.kiro/specs/ghostagent/requirements.md']);assert.ok(files['.kiro/steering/product.md']);
});
test('unknown ideas are explicitly marked as generic prototypes',()=>{
  const p=createProject({idea:'想做一个可以展示星球的天文互动网站'});
  assert.equal(p.kind,'generic');assert.match(p.documents.requirements,/通用清单/);
  assert.match(p.documents.design,/尚未实现/);
});
test('out-of-scope requests remain visible as risks',()=>{
  const plan=analyzeIdea('做一个有登录、云端同步和支付功能的便签网站');
  assert.equal(plan.kind,'notes');assert.ok(plan.risks.some(x=>x.includes('账户')));
  assert.ok(plan.risks.some(x=>x.includes('云端')));assert.ok(plan.risks.some(x=>x.includes('付款')));
});
test('themes are validated and actually change starter styles',()=>{
  const a=createProject({idea:EXAMPLES.todo,preset:'forest'});
  const b=createProject({idea:EXAMPLES.todo,preset:'midnight'});
  assert.match(a.code,/#568875/);assert.match(b.code,/#ad99f0/);
  assert.throws(()=>createProject({idea:EXAMPLES.todo,preset:'unknown'}));
});
test('hostile input cannot escape HTML or terminate script constants',()=>{
  const idea='做一个便签 </script><script>alert(1)</script> " onclick="x"';
  const aiPlan={name:'</title><script>alert(1)</script>',summary:idea,features:['示例'],assumptions:['无'],risks:['无']};
  const p=createProject({idea,aiPlan});
  assert.ok(p.code.includes('&lt;/title&gt;'));assert.equal((p.code.match(/<script>/g)||[]).length,1);
  assert.doesNotThrow(()=>new vm.Script(p.code.match(/<script>([\s\S]*?)<\/script>/)[1]));
  assert.equal(escapeHtml('<>&"\''),'&lt;&gt;&amp;&quot;&#39;');
});
test('AI must return a bounded, typed plan; extra fields never execute',()=>{
  for(const bad of [null,[],{}, {name:'x',summary:'y',features:'x',assumptions:[],risks:[]}])assert.throws(()=>validateAIPlan(bad));
  assert.throws(()=>validateAIPlan({name:'x',summary:'y',features:['x'.repeat(601)],assumptions:['x'],risks:['x']}));
  const p=createProject({idea:EXAMPLES.notes,aiPlan:{name:'AI 便签',summary:'整理灵感',features:['新增便签'],assumptions:['仅本地'],risks:['没有备份'],code:'malicious'}});
  assert.equal(p.mode,'ai');assert.equal(p.name,'AI 便签');assert.notEqual(p.code,'malicious');
  assert.match(p.documents.requirements,/不等于已实现/);assert.match(p.documents.tasks,/核对 AI 目标/);
});
test('storage is namespaced by idea and stable across themes',()=>{
  const idea=EXAMPLES.todo;
  const getKey=p=>p.code.match(/"storageKey":"([^"]+)"/)[1];
  assert.equal(getKey(createProject({idea,preset:'minimal'})),getKey(createProject({idea,preset:'forest'})));
  assert.notEqual(getKey(createProject({idea})),getKey(createProject({idea:idea+'支持分类。'})));
});
test('CRC32 matches the published reference vector',()=>{
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
});
test('ZIP preserves UTF-8 paths, bodies, and central directory offsets',()=>{
  const files={'便签.txt':'你好，世界','.kiro/specs/requirements.md':'# hello\nworld'};
  const zip=zipFiles(files);const view=new DataView(zip.buffer);let offset=0;
  const decoder=new TextDecoder();
  for(const [name,body] of Object.entries(files)) {
    assert.equal(view.getUint32(offset,true),0x04034b50);
    assert.equal(view.getUint16(offset+6,true),0x800);
    const size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true);
    const data=zip.slice(offset+30+nameLength,offset+30+nameLength+size);
    assert.equal(decoder.decode(zip.slice(offset+30,offset+30+nameLength)),name);
    assert.equal(decoder.decode(data),body);assert.equal(crc32(data),view.getUint32(offset+14,true));
    offset+=30+nameLength+size;
  }
  assert.equal(view.getUint32(offset,true),0x02014b50);
  assert.equal(view.getUint32(zip.length-22,true),0x06054b50);
  assert.equal(view.getUint32(zip.length-6,true),offset);
  assert.throws(()=>zipFiles({'../escape':'x'}));
});
