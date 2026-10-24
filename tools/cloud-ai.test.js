import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeGemini,publicSearchResults} from '../supabase/functions/magus-analyze/gemini.js';
import {createAnalyzeHandler} from '../supabase/functions/magus-analyze/handler.js';
const categories=[{id:'porta-chaves',name:'Porta-Chaves'}];
const image='data:image/png;base64,aGVsbG8=';
const product=()=>({name:'Poké Bola',price:'12€',category:'porta-chaves',notes:'',photos:[0,0.33,0.66].map(x=>({x,y:0.1,width:0.3,height:0.8}))});
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
function providerMock({status=200,search=true,invalid=false,secondaryStatus=200}={}){
  const calls=[];let generations=0;
  const fetcher=async(url,options={})=>{
    const address=String(url);calls.push({url:address,options});
    if(address.startsWith('https://html.duckduckgo.com/'))return new Response(search?'<a class="result__a" href="https://example.com/pokeball">Porta-chaves de Poké Bola</a>':'<p>No results</p>');
    assert.match(address,/^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\/gemini-3\.5-flash-lite:generateContent$/);
    const second=generations++>0,code=second?secondaryStatus:status;
    if(code!==200)return new Response('{}',{status:code});
    const data=second?{names:[{index:0,name:'Porta-chaves Poké Bola',notes:'Confirmar nas fontes.',price:'999€',photos:[]}]}:{products:[product()]};
    return json({candidates:[{finishReason:'STOP',content:{parts:[{text:invalid?'{broken':JSON.stringify(data)}]}}]});
  };return {fetcher,calls};
}
test('online Gemini keeps three photos and price while researching only textual names',async()=>{
  const mocked=providerMock(),result=await analyzeGemini({image,categories,key:'test-secret'},mocked.fetcher);
  assert.equal(result.products[0].name,'Porta-chaves Poké Bola');assert.equal(result.products[0].price,'12€');assert.equal(result.products[0].photos.length,3);assert.equal(result.sources.length,1);
  assert.equal(mocked.calls.length,3);const initial=JSON.parse(mocked.calls[0].options.body);assert.equal(initial.contents[0].parts[1].inlineData.data,'aGVsbG8=');assert.ok(!initial.tools);
  const search=mocked.calls.find(c=>c.url.includes('duckduckgo'));assert.ok(!search.url.includes('aGVsbG8'));assert.ok(!JSON.stringify(search.options).includes('test-secret'));
  assert.ok(mocked.calls.every(c=>!c.url.includes('test-secret')));
});
test('quota and key errors stop immediately without a paid fallback or secret leakage',async()=>{
  for(const [status,expected] of [[429,429],[403,503],[404,503]]){const mocked=providerMock({status});await assert.rejects(analyzeGemini({image,categories,key:'test-secret'},mocked.fetcher),e=>e.status===expected&&!e.message.includes('test-secret'));assert.equal(mocked.calls.length,1);}
  const mocked=providerMock();await assert.rejects(analyzeGemini({image,categories,key:''},mocked.fetcher),/GEMINI_API_KEY/);assert.equal(mocked.calls.length,0);
});
test('search failures and secondary quota retain valid vision results for review',async()=>{
  let mocked=providerMock({search:false}),result=await analyzeGemini({image,categories,key:'test'},mocked.fetcher);assert.equal(result.products[0].name,'Poké Bola');assert.match(result.products[0].notes,/sem resultados/);assert.equal(mocked.calls.length,2);
  mocked=providerMock({secondaryStatus:429});result=await analyzeGemini({image,categories,key:'test'},mocked.fetcher);assert.equal(result.products[0].price,'12€');assert.equal(result.products[0].photos.length,3);assert.match(result.products[0].notes,/revisão manual/);
});
test('malformed or invalid input is rejected before producing a draft',async()=>{
  let mocked=providerMock({invalid:true});await assert.rejects(analyzeGemini({image,categories,key:'test'},mocked.fetcher),e=>e.status===422);
  mocked=providerMock();await assert.rejects(analyzeGemini({image:'https://evil.example/image',categories,key:'test'},mocked.fetcher),/imagem/);assert.equal(mocked.calls.length,0);
  assert.deepEqual(publicSearchResults('<a class="result__a" href="javascript:alert(1)">Wrong</a>'),[]);
});
function handlerMock({admin=true,quota=true,key='test',authenticated=true}={}){
  const network=providerMock(),rpc=[];
  const client={auth:{getUser:async()=>({data:{user:authenticated?{id:'test-user'}:null}})},rpc:async name=>{rpc.push(name);return {data:name==='magus_is_admin'?admin:quota};},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{catalog:{categories}}})})})})};
  const values={MAGUS_ALLOWED_ORIGINS:'https://magusart.pt',GEMINI_API_KEY:key,SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public-test'};
  return {handler:createAnalyzeHandler({createClient:()=>client,env:name=>values[name],fetcher:network.fetcher}),network,rpc};
}
const request=({origin='https://magusart.pt',token='example',body={image},method='POST'}={})=>new Request('https://example.supabase.co/functions/v1/magus-analyze',{method,headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(method==='POST'?{body:JSON.stringify(body)}:{})});
test('cloud endpoint rejects invalid origins, sessions and permissions before model calls',async()=>{
  for(const [settings,req,status] of [[{},request({origin:'https://evil.example'}),403],[{},request({token:''}),401],[{authenticated:false},request(),401],[{admin:false},request(),403],[{quota:false},request(),429],[{key:''},request(),503]]){const m=handlerMock(settings),response=await m.handler(req);assert.equal(response.status,status);assert.equal(m.network.calls.length,0);}
});
test('cloud preflight and authenticated analysis succeed without publishing content',async()=>{
  const m=handlerMock(),preflight=await m.handler(request({method:'OPTIONS',token:''}));assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://magusart.pt');
  const response=await m.handler(request());assert.equal(response.status,200);assert.equal((await response.json()).products[0].photos.length,3);assert.deepEqual(m.rpc,['magus_is_admin','magus_ai_take_slot']);
});
