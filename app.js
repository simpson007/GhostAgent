import {EXAMPLES, normalizeIdea, createProject, projectFiles} from './generator.js';
import {zipFiles} from './zip.js';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'ghostagent-projects-v1';
let currentProject = null, currentTab = 'requirements', busy = false, aiEnabled = false;
let toastTimer;
let history = readHistory();

function isProject(p) {
  return p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.length <= 80 &&
    typeof p.idea === 'string' && typeof p.code === 'string' && p.code.length < 100000 &&
    ['minimal','midnight','forest'].includes(p.preset) && ['ai','template'].includes(p.mode) &&
    Number.isFinite(Date.parse(p.createdAt)) && p.documents &&
    ['requirements','design','tasks'].every(k=>typeof p.documents[k] === 'string' && p.documents[k].length < 60000);
}
function readHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(isProject).slice(0,8) : [];
  } catch { return []; }
}
function saveHistory() {
  let saved=true;
  try {localStorage.setItem(STORAGE_KEY, JSON.stringify(history));}
  catch {saved=false;showToast('浏览器存储不可用或已满，本次修改尚未持久化，请下载项目保存。');}
  $('history-count').textContent = history.length;
  return saved;
}
function showToast(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
  toastTimer = setTimeout(()=>$('toast').hidden=true,4000);
}
function switchView(view) {
  for(const name of ['workbench','history','guide']) $(name+'-view').hidden = name !== view;
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active', b.dataset.view === view));
  $('page-title').textContent = {workbench:'创作工作台',history:'我的项目',guide:'使用指南'}[view];
  if(view === 'history') renderHistory();
  window.scrollTo({top:0,behavior:'instant'});
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
document.querySelectorAll('[data-open-guide]').forEach(b=>b.addEventListener('click',()=>switchView('guide')));
document.querySelectorAll('[data-example]').forEach(b=>b.addEventListener('click',()=>{
  if(busy)return;
  $('idea').value=EXAMPLES[b.dataset.example];updateCount();$('idea').focus();
}));
function updateCount() {$('char-count').textContent=`${$('idea').value.length} / 2000`;}
$('idea').addEventListener('input',updateCount);

// A small renderer that constructs DOM nodes; model/user content is never HTML.
function appendInline(parent, text) {
  text.split(/(`[^`]+`)/g).forEach(part=>{
    if(part.startsWith('`') && part.endsWith('`')){const code=document.createElement('code');code.textContent=part.slice(1,-1);parent.append(code);}
    else parent.append(document.createTextNode(part));
  });
}
function renderDocument(text) {
  const fragment=document.createDocumentFragment();let list=null, code=null;
  for(const line of text.split('\n')) {
    if(line.startsWith('```')) {
      if(code)code=null;
      else {const pre=document.createElement('pre');code=document.createElement('code');pre.append(code);fragment.append(pre);}
      list=null;continue;
    }
    if(code){code.textContent+=line+'\n';continue;}
    if(!line.trim()){list=null;continue;}
    const heading=/^(#{1,3}) (.*)$/.exec(line);
    if(heading){const h=document.createElement('h'+heading[1].length);appendInline(h,heading[2]);fragment.append(h);list=null;continue;}
    if(line.startsWith('- ')){
      if(!list){list=document.createElement('ul');fragment.append(list);}
      const li=document.createElement('li');appendInline(li,line.slice(2).replace(/^\[x\] /,'✓ ').replace(/^\[ \] /,'□ '));list.append(li);continue;
    }
    list=null;const p=document.createElement('p');appendInline(p,line.replace(/^> /,''));fragment.append(p);
  }
  $('document-output').replaceChildren(fragment);
}
function renderResult() {
  $('empty-state').hidden = busy || !!currentProject;
  $('loading-state').hidden = !busy;
  $('document-output').hidden = true; $('code-output').hidden=true;
  $('preview-output').hidden=busy || !currentProject || currentTab !== 'preview';
  $('copy-button').disabled = !currentProject || busy || currentTab === 'preview';
  $('download-button').disabled = !currentProject || busy;
  if(busy || !currentProject) return;
  $('output-badge').textContent = currentProject.mode === 'ai' ? 'AI 规格 · 模板代码' : '模板生成完成';
  $('output-info').textContent = currentProject.kind === 'generic' ? '通用清单原型 · 业务功能待扩展' : '3 份规格 + 1 个可运行原型';
  if(currentTab === 'code') {
    $('code-output').querySelector('code').textContent=currentProject.code;$('code-output').hidden=false;
  } else if(currentTab === 'preview') {
    // Opaque-origin sandbox: no access to the parent page, cookies, or API keys.
    let frame=$('preview-output');
    if(frame.dataset.project !== currentProject.id){
      // Fresh browsing context avoids stale/zero-size layouts after repeated
      // display:none + srcdoc navigations in Chromium's sandboxed frames.
      const next=document.createElement('iframe');next.id='preview-output';
      next.title='生成的 Web 原型预览';next.setAttribute('sandbox','allow-scripts allow-forms');
      next.referrerPolicy='no-referrer';next.dataset.project=currentProject.id;next.srcdoc=currentProject.code;
      frame.replaceWith(next);frame=next;
    }
    frame.hidden=false;
    $('output-info').textContent='沙箱预览 · 下载后可测试持久化';
  } else {renderDocument(currentProject.documents[currentTab]);$('document-output').hidden=false;}
}
function setTab(tab) {
  currentTab=tab;
  document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
  $('result-content').setAttribute('aria-labelledby','tab-'+tab);
  renderResult();
}
const tabs=[...document.querySelectorAll('[data-tab]')];
tabs.forEach((b,index)=>{
  b.addEventListener('click',()=>setTab(b.dataset.tab));
  b.addEventListener('keydown',event=>{
    let target;
    if(event.key==='ArrowRight')target=tabs[(index+1)%tabs.length];
    if(event.key==='ArrowLeft')target=tabs[(index+tabs.length-1)%tabs.length];
    if(event.key==='Home')target=tabs[0];if(event.key==='End')target=tabs.at(-1);
    if(target){event.preventDefault();target.focus();setTab(target.dataset.tab);}
  });
});

$('idea-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  $('form-error').hidden=true;
  try {
    const idea=normalizeIdea($('idea').value),preset=$('preset').value;
    busy=true;
    $('generate-button').disabled=true;$('generate-button').querySelector('span').textContent='正在梳理灵感…';
    $('output-badge').textContent=aiEnabled?'AI 正在整理':'正在整理';
    renderResult();
    let aiPlan=null;
    if(aiEnabled) {
      const response=await fetch('./api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idea}),signal:AbortSignal.timeout(50000)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error || 'AI 服务暂时出错，请检查服务器配置。');
      aiPlan=data.plan;
    }
    currentProject=createProject({idea,preset,aiPlan});
    history=[currentProject,...history.filter(x=>x.id!==currentProject.id)].slice(0,8);
    const saved=saveHistory();
    setTab('requirements');
    if(saved)showToast(aiEnabled?'AI 已梳理规格，代码使用本地模板。':'项目已生成，试试预览你的第一个版本。');
  } catch(error) {
    $('form-error').textContent=error.name==='TimeoutError'?'AI 请求超时，请稍后重试。':error.message;
    $('form-error').hidden=false;
    $('output-badge').textContent=currentProject?'保留上一次结果':'生成未完成';
  } finally {
    busy=false;$('generate-button').disabled=false;$('generate-button').querySelector('span').textContent='让想法显形';renderResult();
  }
});

$('copy-button').addEventListener('click',async()=>{
  if(!currentProject)return;
  const text=currentTab==='code'?currentProject.code:currentProject.documents[currentTab];
  try {await navigator.clipboard.writeText(text);showToast('已复制到剪贴板。');}
  catch {showToast('剪贴板权限未开启，请选中文字复制，或下载项目。');}
});
function downloadProject(project) {
  const blob=new Blob([zipFiles(projectFiles(project))],{type:'application/zip'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`ghostagent-${project.kind}-${project.id.slice(0,8)}.zip`;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);showToast('项目包已准备好，包含 .kiro 规格和可运行代码。');
}
$('download-button').addEventListener('click',()=>currentProject&&downloadProject(currentProject));

function renderHistory() {
  $('history-list').replaceChildren();$('clear-history').disabled=history.length===0;
  if(!history.length) {
    const card=document.createElement('div');card.className='history-empty panel';
    const h=document.createElement('h3');h.textContent='下一次创造，还在等你。';
    const p=document.createElement('p');p.textContent='生成的项目会出现在这里，随时回来继续。';
    const b=document.createElement('button');b.className='primary-button';b.textContent='开始第一个项目 →';b.addEventListener('click',()=>switchView('workbench'));card.append(h,p,b);$('history-list').append(card);return;
  }
  for(const project of history) {
    const card=document.createElement('article');card.className='history-card panel';
    const meta=document.createElement('div');meta.className='history-meta';
    const badge=document.createElement('span');badge.textContent=project.mode==='ai'?'AI 规格 + 模板原型':'本地模板项目';
    const time=document.createElement('time');time.dateTime=project.createdAt;time.textContent=new Date(project.createdAt).toLocaleString('zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});meta.append(badge,time);
    const title=document.createElement('h3');title.textContent=project.name;
    const p=document.createElement('p');p.textContent=project.idea.slice(0,160)+(project.idea.length>160?'…':'');
    const actions=document.createElement('div');actions.className='history-actions';
    for(const [text,callback] of [
      ['继续查看',()=>{currentProject=project;$('idea').value=project.idea;$('preset').value=project.preset;updateCount();setTab('requirements');switchView('workbench');}],
      ['下载项目',()=>downloadProject(project)],
      ['删除',()=>{history=history.filter(p=>p.id!==project.id);const saved=saveHistory();renderHistory();if(saved)showToast('已删除该项目记录。');}],
    ]){const button=document.createElement('button');button.className='quiet-button';button.textContent=text;button.addEventListener('click',callback);actions.append(button);}
    card.append(meta,title,p,actions);$('history-list').append(card);
  }
}
$('clear-history').addEventListener('click',()=>{
  if(!confirm('清空这个浏览器里的所有项目记录？已下载的文件不受影响。'))return;
  history=[];const saved=saveHistory();renderHistory();if(saved)showToast('浏览器中的项目记录已清空。');
});

async function detectMode() {
  if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))return;
  try {
    const response=await fetch('./api/config',{signal:AbortSignal.timeout(3000)});
    if(!response.ok)return;
    const data=await response.json();aiEnabled=data.aiEnabled===true;
    if(aiEnabled) {
      $('mode-status').replaceChildren();const dot=document.createElement('i');$('mode-status').append(dot,document.createTextNode('AI 模式 · 服务端已配置'));
      $('mode-help').textContent='AI 整理需求，代码使用本地模板。输入将发送到已配置的模型服务。';
    }
  } catch { /* Static hosting remains fully usable without an API. */ }
}
$('history-count').textContent=history.length;
detectMode();
