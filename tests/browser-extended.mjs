import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createProject,EXAMPLES} from '../generator.js';
const root=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const base=process.env.BASE_URL || 'http://127.0.0.1:4173';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'chrome',headless:true});
const servers=[];
async function serve(handler){const s=createServer(handler);await new Promise(r=>s.listen(0,'127.0.0.1',r));servers.push(s);return 'http://127.0.0.1:'+s.address().port;}
try {
const page=await browser.newPage({timezoneId:'Asia/Shanghai'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let project=createProject({idea:EXAMPLES.notes});
const starterBase=await serve((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(project.code);});
await page.goto(starterBase);await page.locator('#text').fill('保存后刷新');await page.locator('#submit').click();await page.reload();
assert.equal(await page.locator('.item .text').textContent(),'保存后刷新');
project=createProject({idea:EXAMPLES.habit});await page.goto(starterBase);await page.locator('#text').fill('每日阅读');await page.locator('#submit').click();await page.locator('[type=checkbox]').check();await page.reload();assert.ok(await page.locator('[type=checkbox]').isChecked());
const date=await page.locator('#today').textContent();assert.match(date,/\d{4}-\d{2}-\d{2}/);
const prefixBase=await serve(async(req,res)=>{
 try {if(req.url.includes('api/config')){res.writeHead(404);return res.end();}
 const name=req.url==='/GhostAgent/'?'index.html':req.url.replace(/^\/GhostAgent\//,'');
 if(!['index.html','styles.css','app.js','generator.js','zip.js','assets/ghost.svg'].includes(name)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'text/html');res.end(await fs.readFile(root+'/'+name));
 }catch{res.writeHead(500);res.end();}
});
await page.goto(prefixBase+'/GhostAgent/');await page.locator('[data-example=todo]').click();await page.locator('#generate-button').click();assert.match(await page.locator('#document-output').textContent(),/极简待办清单/);
await page.locator('[data-tab=preview]').click();await page.waitForTimeout(150);assert.ok(await page.frameLocator('#preview-output').locator('#text').isVisible());
const ai=await browser.newPage();
await ai.route('**/api/config',route=>route.fulfill({json:{aiEnabled:true}}));
let requests=0;
await ai.route('**/api/generate',async route=>{requests++;const body=route.request().postDataJSON();assert.ok(body.idea);await route.fulfill({json:{plan:{name:'AI 规划便签',summary:'记录灵感',features:['建立便签'],assumptions:['仅本地'],risks:['无云备份']}}});});
await ai.goto(base);await ai.waitForFunction(()=>document.getElementById('mode-status').textContent.includes('AI 模式'));
await ai.locator('[data-example=notes]').click();await ai.locator('#generate-button').click();await ai.waitForFunction(()=>document.getElementById('output-badge').textContent.includes('AI 规格'));assert.match(await ai.locator('#document-output').textContent(),/AI 规划便签/);assert.equal(requests,1);
await ai.route('**/api/generate',route=>route.fulfill({status:502,json:{error:'模拟模型服务异常'}}));await ai.locator('#generate-button').click();await ai.locator('#form-error').waitFor({state:'visible'});assert.match(await ai.locator('#form-error').textContent(),/模拟模型/);assert.match(await ai.locator('#document-output').textContent(),/AI 规划便签/);
const limited=await browser.newPage();await limited.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('QuotaExceededError');};});await limited.goto(base);await limited.locator('[data-example=todo]').click();await limited.locator('#generate-button').click();assert.match(await limited.locator('#output-badge').textContent(),/模板生成完成/);
assert.match(await limited.locator('#toast').textContent(),/存储不可用/);
assert.deepEqual(errors,[]);
console.log('EXTENDED PASS: downloaded notes persistence, habit persistence/local dates, /GhostAgent/ subpath, AI UI success/error preservation, storage failure');
}finally{await browser.close();for(const s of servers){s.closeAllConnections();await new Promise(r=>s.close(r));}}
