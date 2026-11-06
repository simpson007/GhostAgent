/** Pure, dependency-free project planning and starter generation. */
export const EXAMPLES = {
  todo: '做一个极简待办清单，支持添加任务、标记完成、删除任务，刷新后保留数据。',
  notes: '做一个灵感便签本，可以创建便签、搜索内容、编辑和删除便签，使用本地存储。',
  habit: '做一个每日习惯打卡工具，可以添加习惯、按天打卡、撤销打卡、删除习惯并保存数据。',
};

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function normalizeIdea(idea) {
  if (typeof idea !== 'string') throw new Error('请输入项目想法。');
  const clean = idea.trim().replace(/\r\n?/g, '\n');
  if (clean.length < 6) throw new Error('再描述具体一点吧，至少输入 6 个字符。');
  if (clean.length > 2000) throw new Error('想法请控制在 2000 个字符以内。');
  return clean;
}

export function analyzeIdea(input) {
  const idea = normalizeIdea(input);
  const kind = /便签|笔记|note\b/i.test(idea) ? 'notes' : /习惯|打卡|habit\b/i.test(idea) ? 'habit' : /待办|任务|todo\b|to-do/i.test(idea) ? 'todo' : 'generic';
  const names = {todo:'极简待办清单',notes:'灵感便签本',habit:'每日习惯打卡',generic:'我的灵感原型'};
  const features = {
    todo: ['添加任务，拒绝空白内容', '切换任务的完成状态', '删除任务，查看全部 / 未完成 / 已完成任务', '用 localStorage 保存数据，刷新后恢复'],
    notes: ['创建文字便签，拒绝空白内容', '编辑和删除已保存的便签', '按关键词搜索便签', '用 localStorage 保存数据，刷新后恢复'],
    habit: ['添加和删除习惯', '按浏览器本地日期记录每日打卡', '重复点击可撤销当天打卡', '用 localStorage 保存习惯与打卡记录'],
    generic: ['新增一条文字记录，拒绝空白内容', '切换记录的完成状态与删除记录', '用 localStorage 保存数据，刷新后恢复'],
  }[kind];
  const assumptions = ['首版为单人、单设备的 Web 原型，不包含账户系统或云端同步。', '代码来自经过测试的本地预置模板，不是任意业务需求的自动完整实现。'];
  if (kind === 'generic') assumptions.push('当前想法暂未匹配专用模板，以通用清单演示交互；请根据原始需求继续实现业务功能。');
  const risks = ['浏览器本地数据不是备份；清理站点数据将删除内容。'];
  if (/登录|注册|账户|账号|login|auth/i.test(idea)) risks.push('你提到的登录 / 账户功能尚未实现，需要补充服务端认证。');
  if (/数据库|云端|同步|database|sync|多人|协作|后端|后台|full.?stack/i.test(idea)) risks.push('云端数据库、多人协作和后端服务不在本次原型内，需作为后续任务实现。');
  if (/支付|付款|pay|交易/i.test(idea)) risks.push('付款与交易功能未实现；上线前需要接入支付服务并完成服务端验证。');
  return {kind, name:names[kind], summary:idea, features, assumptions, risks};
}

/** The model may refine the plan, but it never supplies executable HTML. */
export function validateAIPlan(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('AI 返回的规格格式不正确，请重试。');
  const text = (x, limit) => typeof x === 'string' && x.trim().length > 0 && x.length <= limit;
  if (!text(value.name, 80) || !text(value.summary, 3000)) throw new Error('AI 返回的名称或摘要格式不正确。');
  for (const key of ['features', 'assumptions', 'risks']) {
    if (!Array.isArray(value[key]) || value[key].length < 1 || value[key].length > 12 || !value[key].every(x => text(x, 600))) throw new Error(`AI 返回的 ${key} 格式不正确。`);
  }
  return {name:value.name.trim(), summary:value.summary.trim(), features:value.features.map(x=>x.trim()), assumptions:value.assumptions.map(x=>x.trim()), risks:value.risks.map(x=>x.trim())};
}

export function createProject({idea, preset = 'minimal', aiPlan = null}) {
  const base = analyzeIdea(idea);
  if (!['minimal','midnight','forest'].includes(preset)) throw new Error('请选择有效的原型风格。');
  const plan = aiPlan ? {...base, ...validateAIPlan(aiPlan)} : base;
  const mode = aiPlan ? 'ai' : 'template';
  const list = values => values.map(x => `- ${x}`).join('\n');
  const prompt = base.summary.replace(/^/gm, '> ');
  const requirements = `# ${plan.name} · 需求规格\n\n## 1. 原始想法\n${prompt}\n\n## 2. 项目目标\n${plan.summary}\n\n## 3. ${aiPlan ? 'AI 梳理的目标功能（不等于已实现）' : '模板原型已覆盖的功能'}\n${list(plan.features)}\n\n## 4. 原型验收标准\n- 当输入为空白时，系统应提示用户，不新增记录。\n- 当用户提交有效内容时，系统应展示新记录。\n- 当用户删除一条记录时，系统应只移除选中记录。\n- 当页面刷新且本地存储可用时，系统应恢复保存的内容。\n- 当本地存储不可用时，系统应明确提示仅为临时会话。\n- 页面应适配手机，表单具备标签，操作支持键盘。\n\n## 5. 假设与范围\n${list(plan.assumptions)}\n\n## 6. 风险与待确认\n${list(plan.risks)}\n\n## 7. 生成来源\n${aiPlan ? '需求由你配置的模型整理；代码仍由本地模板生成。AI 目标功能需逐项审阅，不能视作已实现。' : '本地规则和预置模板生成，未调用大模型。模板功能是建议的最小范围，请与原始需求逐项核对。'}\n`;
  const design = `# ${plan.name} · 架构设计\n\n## 技术选择\n- HTML + CSS + 原生 JavaScript，无构建依赖。\n- localStorage 存储 JSON，仅在当前浏览器当前来源生效。\n- 代码模板：${base.name}；风格：${preset}。\n\n## 数据流\n\`\`\`text\n用户输入 → 非空校验 → 更新内存状态 → 写入 localStorage → 重绘页面\n\`\`\`\n\n## 数据结构\n\`\`\`json\n${JSON.stringify(base.kind === 'habit' ? {id:'uuid',text:'阅读 10 分钟',dates:['2026-11-06']} : {id:'uuid',text:'一条记录',done:false}, null, 2)}\n\`\`\`\n\n## 模块边界\n- index.html：独立可运行的 Web 原型，内含样式和交互。\n- .kiro/specs/ghostagent/：需求、设计和任务清单。\n- .kiro/steering/product.md：供 Kiro 继续开发时参考的约束。\n- README.md：运行方式和已知限制。\n\n## 安全和隐私\n- 用户内容通过 textContent 插入，不作为 HTML 执行。\n- 没有账户、网络请求、数据库或服务器密钥。\n- 网页内嵌预览运行在隔离 iframe 中，本地存储可能被浏览器禁用。\n- 下载后通过 HTTP 服务运行，即可在正常来源下使用本地存储。\n\n## 尚未实现\n- 登录、云同步、支付以及任意自定义业务流程。\n- AI 梳理出的额外功能不自动进入代码模板；先补充验收标准再实现。\n`;
  const tasks = `# ${plan.name} · 任务清单\n\n## 已生成（仍需人工验收）\n- [x] 提供单文件、无依赖的 Web 原型\n- [x] 添加文本记录和非空校验\n- [x] 实现${base.kind === 'notes' ? '便签搜索、编辑和删除' : base.kind === 'habit' ? '按天打卡、撤销打卡和删除' : '完成状态切换、筛选和删除'}\n- [x] 本地持久化和存储异常提示\n- [x] 生成 requirements / design / tasks 文档\n\n## 开发者接下来要做\n- [ ] 对照原始需求核对每一项功能，删除不需要的模板默认项\n- [ ] 在 Kiro 中打开项目，审阅 .kiro/specs/ghostagent/ 下的三份规格\n- [ ] 将未覆盖的业务需求拆成小任务并实际实现\n${aiPlan ? plan.features.map(f=>`- [ ] 核对 AI 目标功能与代码覆盖情况：${f}`).join('\n')+'\n' : ''}- [ ] 按验收标准测试空输入、新增、删除、刷新和移动端\n- [ ] 测试键盘、屏幕阅读器和本地存储失败的情况\n- [ ] 若有账户 / 云同步需求，另行设计并实现服务端\n- [ ] 部署演示站，验证链接后录制真实演示视频\n\n## 记录真实使用过程\n- [ ] 在实际使用 Kiro 后，保存真实的规格迭代和开发记录\n- [ ] 根据实际情况填写项目介绍，不把预置文案当作已发生的开发经历\n`;
  const code = buildStarter(plan.name, base.kind, preset, base.summary);
  return {id:globalThis.crypto.randomUUID(), createdAt:new Date().toISOString(), idea:base.summary, preset, mode, name:plan.name, kind:base.kind, documents:{requirements,design,tasks}, code};
}

function buildStarter(name, kind, preset, idea) {
  const themes = {minimal:['#f7f6fb','#ffffff','#7967ce','#2d283b','#8f879f'],midnight:['#191722','#252132','#ad99f0','#f1eafb','#b5a5ce'],forest:['#f0f5f0','#ffffff','#568875','#243e32','#85998e']};
  const [bg,paper,accent,ink,muted] = themes[preset];
  const hint = {todo:'把今天要做的事，轻轻放在这里。',notes:'捕捉一闪而过的灵感。',habit:'每一天的小小坚持，都值得被记住。',generic:'这是通用清单原型，专属业务功能留待下一步实现。'}[kind];
  const placeholder = kind === 'notes' ? '写下一个灵感…' : kind === 'habit' ? '添加一个想坚持的习惯…' : '接下来想做什么？';
  // Serialize code constants separately from HTML to avoid script-tag termination.
  const js = JSON.stringify({kind,storageKey:`ghostagent-starter-${kind}-${hashString(idea)}`}).replace(/</g,'\\u003c');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(name)}</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:${bg};color:${ink};line-height:1.6}*{box-sizing:border-box}body{margin:0;padding:45px 20px}main{max-width:580px;margin:auto}header small{color:${accent};letter-spacing:2px;font-size:10px}h1{font-size:29px;font-weight:650;margin:12px 0 6px;overflow-wrap:anywhere}.intro{color:${muted};font-size:13px;margin-bottom:25px}form{display:flex;gap:9px}input,textarea,button{font:inherit}input,textarea{background:${paper};border:1px solid ${muted}44;color:${ink};border-radius:9px;padding:12px;min-width:0;width:100%;font-size:13px}textarea{resize:vertical;min-height:90px}button{border:0;border-radius:8px;cursor:pointer;padding:9px 14px;background:${accent};color:#fff;font-size:12px;white-space:nowrap}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid ${accent}77;outline-offset:3px}form button{align-self:stretch}.filters{display:flex;gap:7px;margin:19px 0}.filters button{background:transparent;color:${muted};padding:5px 10px}.filters button[aria-pressed="true"]{background:${accent}22;color:${accent}}#search{margin-top:18px}#list{padding:0;margin:20px 0;list-style:none;display:grid;gap:10px}.item{display:flex;align-items:center;gap:12px;background:${paper};border:1px solid ${muted}22;border-radius:11px;padding:15px}.item .text{flex:1;font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;min-width:0}.item.done .text{text-decoration:line-through;opacity:.5}.item input[type="checkbox"]{width:17px;height:17px;accent-color:${accent};flex-shrink:0;cursor:pointer}.delete,.edit{color:${muted};background:transparent;padding:5px;font-size:11px}.empty{padding:30px 12px;text-align:center;color:${muted};font-size:13px}.meta{font-size:11px;color:${muted};margin-top:20px}.notice{font-size:11px;color:${accent};min-height:18px}.badge{font-size:10px;display:inline-block;color:${accent};background:${accent}15;padding:3px 8px;border-radius:5px;margin-top:6px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:420px){body{padding:30px 15px}.item{gap:8px;padding:12px}h1{font-size:25px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style>
</head>
<body><main>
<header><small>A LITTLE IDEA, MADE REAL</small><h1>${escapeHtml(name)}</h1><p class="intro">${hint}</p></header>
<form id="form"><label for="text" class="sr-only">${placeholder}</label>${kind === 'notes' ? `<textarea id="text" maxlength="1000" placeholder="${placeholder}" required></textarea>` : `<input id="text" maxlength="200" placeholder="${placeholder}" autocomplete="off" required>`}<button type="submit" id="submit">添加</button><button type="button" id="cancel" hidden>取消编辑</button></form>
${kind === 'notes' ? '<label for="search" class="sr-only">搜索便签</label><input id="search" placeholder="搜索便签…" type="search">' : kind !== 'habit' ? '<div class="filters" aria-label="筛选"><button type="button" data-filter="all" aria-pressed="true">全部</button><button type="button" data-filter="open" aria-pressed="false">未完成</button><button type="button" data-filter="done" aria-pressed="false">已完成</button></div>' : '<p class="badge" id="today"></p>'}
<p class="notice" id="notice" role="status" aria-live="polite"></p><ul id="list"></ul><p class="meta" id="count"></p><p class="meta">GhostAgent starter · 本地原型 · 无登录 / 无云同步</p>
</main>
<script>
(() => {
  'use strict';
  const {kind,storageKey} = ${js};
  const $ = id => document.getElementById(id);
  const localDay = () => {const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  let items=[],filter='all',editing=null;
  const valid = x => x && typeof x.id==='string' && typeof x.text==='string' && typeof x.done==='boolean' && Array.isArray(x.dates) && x.dates.every(d=>typeof d==='string');
  try { const raw=JSON.parse(localStorage.getItem(storageKey)||'[]'); if(!Array.isArray(raw)||!raw.every(valid))throw Error('invalid');items=raw; }
  catch { $('notice').textContent='存储不可用或旧数据格式异常，当前使用临时会话。下载后通过 HTTP 服务打开可保存数据。'; }
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(items));}catch{$('notice').textContent='本地存储不可用或已满，数据仅保留在本次会话。';}}
  function render(){
    $('list').replaceChildren();
    const today=localDay();
    if($('today'))$('today').textContent='今天 · '+today;
    const query=($('search')?.value||'').toLowerCase();
    const shown=items.filter(x=>kind==='notes'?x.text.toLowerCase().includes(query):kind==='habit'||filter==='all'||(filter==='done'?x.done:!x.done));
    for(const item of shown){
      const li=document.createElement('li');li.className='item';
      const done=kind==='habit'?item.dates.includes(today):item.done;
      if(done&&kind!=='notes')li.classList.add('done');
      if(kind!=='notes'){
        const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=done;toggle.setAttribute('aria-label',(kind==='habit'?'今日打卡：':'切换完成状态：')+item.text);
        toggle.addEventListener('change',()=>{if(kind==='habit'){item.dates=done?item.dates.filter(d=>d!==today):[...item.dates,today];}else item.done=!item.done;save();render();});li.append(toggle);
      }
      const text=document.createElement('span');text.className='text';text.textContent=item.text;li.append(text);
      if(kind==='notes'){
        const edit=document.createElement('button');edit.type='button';edit.className='edit';edit.textContent='编辑';edit.setAttribute('aria-label','编辑：'+item.text);edit.addEventListener('click',()=>{editing=item.id;$('text').value=item.text;$('submit').textContent='保存';$('cancel').hidden=false;$('text').focus();});li.append(edit);
      }
      const del=document.createElement('button');del.type='button';del.className='delete';del.textContent='删除';del.setAttribute('aria-label','删除：'+item.text);del.addEventListener('click',()=>{items=items.filter(x=>x.id!==item.id);if(editing===item.id)resetEditor();save();render();});li.append(del);$('list').append(li);
    }
    if(!shown.length){const empty=document.createElement('li');empty.className='empty';empty.textContent=items.length?'没有匹配的记录。':'这里还是空的，添加第一条吧 ✦';$('list').append(empty);}
    $('count').textContent=kind==='habit'?'共 '+items.length+' 个习惯 · 今日已打卡 '+items.filter(x=>x.dates.includes(today)).length+' 个':kind==='notes'?'共 '+items.length+' 条便签':'共 '+items.length+' 条记录 · 已完成 '+items.filter(x=>x.done).length+' 条';
  }
  function resetEditor(){editing=null;$('text').value='';$('submit').textContent='添加';$('cancel').hidden=true;}
  $('form').addEventListener('submit',event=>{
    event.preventDefault();const text=$('text').value.trim();if(!text){$('notice').textContent='先写点内容吧。';return;}
    if(editing){const item=items.find(x=>x.id===editing);if(item)item.text=text;}
    else items.unshift({id:globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2),text,done:false,dates:[]});
    resetEditor();save();render();$('text').focus();
  });
  $('cancel').addEventListener('click',resetEditor);
  $('search')?.addEventListener('input',render);
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
  if(kind==='habit'){setInterval(render,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});}
  render();
})();
</script>
</body>
</html>`;
}

function hashString(value) {
  let h=2166136261;
  for (const char of value) {h^=char.codePointAt(0);h=Math.imul(h,16777619);}
  return (h>>>0).toString(36);
}

export function projectFiles(project) {
  return {
    'index.html':project.code,
    '.kiro/specs/ghostagent/requirements.md':project.documents.requirements,
    '.kiro/specs/ghostagent/design.md':project.documents.design,
    '.kiro/specs/ghostagent/tasks.md':project.documents.tasks,
    '.kiro/steering/product.md':'---\ninclusion: always\n---\n\n# Product steering\n\n- Review requirements, design and tasks before writing code.\n- Keep the first version small; use semantic HTML and dependency-free JavaScript.\n- Ask about missing business rules instead of inventing them.\n- Keep user data local unless the specification explicitly requires a backend.\n- Never put credentials in browser code.\n- Mark tasks complete only after implementing and testing them.\n',
    'README.md':`# ${project.name}\n\nGenerated with GhostAgent in ${project.mode === 'ai' ? 'AI planning + local starter' : 'local template'} mode.\n\n## Run\n\nRun \`python3 -m http.server 8080\` in this directory, then open http://localhost:8080. No install step.\n\n## Continue in Kiro\n\nOpen this folder in Kiro. Review .kiro/specs/ghostagent/requirements.md, design.md, and tasks.md before implementing additional features.\n\n## Scope\n\nThis is a local-storage frontend prototype, not a completed full-stack application. The template supports ${project.kind} interactions; arbitrary business requirements, accounts and cloud sync need additional implementation. AI-refined requirements are goals, not proof of implementation.\n\nThe browser sandbox preview may not support storage. Use the downloaded project over HTTP to test persistence.\n`,
  };
}
