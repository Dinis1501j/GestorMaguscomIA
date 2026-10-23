import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeLocally,parseSearch} from './local-ai.js';
const image='data:image/png;base64,aGVsbG8=';
const product={name:'Dragão',category:'dragoes',price:'12€',notes:'',photos:[{x:0,y:0,width:0.3,height:1},{x:0.3,y:0,width:0.3,height:1},{x:0.6,y:0,width:0.4,height:1}]};
function mock({admin=true,installed=true,search=true}={}){
 const calls=[];let chats=0;
 const fetcher=async(url,options={})=>{
  url=String(url);calls.push({url,options});let body;
  if(url.endsWith('/auth/v1/user'))body={id:'test-user'};
  else if(url.endsWith('/rpc/magus_is_admin'))body=admin;
  else if(url.endsWith('/api/tags'))body={models:installed?[{name:'qwen3-vl:2b-instruct'}]:[]};
  else if(url.includes('/rest/v1/magus_content'))body=[{catalog:{categories:[{id:'dragoes',name:'Dragões'}]}}];
  else if(url.endsWith('/api/chat'))body={message:{content:JSON.stringify(chats++?{name:'Dragão articulado',notes:'Nome descritivo.'}:{products:[structuredClone(product)]})}};
  else if(url.startsWith('https://html.duckduckgo.com/'))return new Response(search?'<a class="result__a" href="https://example.com/dragao">Dragão articulado</a>':'captcha');
  else throw Error('Unexpected request '+url);
  return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
 };return {calls,fetcher};
}
test('local vision groups three photos and online lookup changes only the name',async()=>{const {calls,fetcher}=mock();const result=await analyzeLocally({image,authorization:'Bearer example'},fetcher);assert.equal(result.products.length,1);assert.equal(result.products[0].photos.length,3);assert.equal(result.products[0].price,'12€');assert.equal(result.products[0].name,'Dragão articulado');assert.equal(result.sources[0].url,'https://example.com/dragao');const chats=calls.filter(c=>c.url.endsWith('/api/chat'));assert.equal(chats.length,2);assert.equal(JSON.parse(chats[0].options.body).messages[1].images[0],'aGVsbG8=');const search=calls.find(c=>c.url.startsWith('https://html.duckduckgo.com/'));assert.ok(!search.url.includes('aGVsbG8'));assert.ok(!chats.some(c=>c.url.includes('openai')));});
test('rejects missing authentication and non-admin users before local inference',async()=>{let mocked=mock();await assert.rejects(analyzeLocally({image},mocked.fetcher),/Inicia sessão/);assert.equal(mocked.calls.length,0);mocked=mock({admin:false});await assert.rejects(analyzeLocally({image,authorization:'Bearer example'},mocked.fetcher),/administradores/);assert.equal(mocked.calls.length,2);});
test('explains missing model and marks unavailable internet results for review',async()=>{let mocked=mock({installed:false});await assert.rejects(analyzeLocally({image,authorization:'Bearer example'},mocked.fetcher),/ollama pull/);mocked=mock({search:false});const result=await analyzeLocally({image,authorization:'Bearer example'},mocked.fetcher);assert.equal(result.products[0].name,'Dragão');assert.match(result.products[0].notes,/sem resultados verificáveis/);assert.equal(result.sources.length,0);});
test('parses public search results safely and skips non-HTTP links',()=>{assert.deepEqual(parseSearch('<a class="result__a" href="javascript:alert(1)">Bad</a><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fproduto">Nome &amp; produto</a>'),[{title:'Nome & produto',url:'https://example.com/produto'}]);});
