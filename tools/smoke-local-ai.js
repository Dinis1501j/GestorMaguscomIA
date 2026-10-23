// Optional real inference test. Supabase is replaced only inside this test;
// the real local model and public name search are used. Nothing is published.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {analyzeLocally} from './local-ai.js';
import {onlineSettings} from '../assets/online-settings.js';
const catalog=JSON.parse(await fs.readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
const fixture=process.argv[2];
process.env.MAGUS_AI_DEBUG='1';
const bytes=await fs.readFile(fixture||new URL('../portachavepokebola.jpeg',import.meta.url));
const fetcher=async(url,options)=>{
  if(String(url).startsWith(onlineSettings.supabaseUrl)) {
    const data=String(url).endsWith('/auth/v1/user')?{id:'smoke-test'}:String(url).endsWith('/rpc/magus_is_admin')?true:[{catalog}];
    return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  }
  return fetch(url,options);
};
const start=Date.now();
const result=await analyzeLocally({image:'data:image/'+(fixture?.endsWith('.png')?'png':'jpeg')+';base64,'+bytes.toString('base64'),authorization:'Bearer test-only'},fetcher);
assert.ok(result.products.length);
if(!fixture)assert.ok(result.products.every(p=>p.price==='??€'),'There is no visible price in this photo.');
console.log(JSON.stringify({seconds:Math.round((Date.now()-start)/1000),products:result.products,sources:result.sources},null,2));
