import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readState,saveState} from './storage.js';
import {analyzeLocally,localStatus} from './local-ai.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.webp':'image/webp'};
export function createServer(directory=root){let saving=false,analyzing=false;return http.createServer(async(req,res)=>{
 const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const origin='http://'+req.headers.host;
 if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')){reply(403,{error:'Acesso apenas local.'});return;}
 if(req.headers.origin&&req.headers.origin!==origin){reply(403,{error:'Origem não autorizada.'});return;}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,origin).pathname);}catch{reply(400,{error:'Endereço inválido.'});return;}
 try{
  if(pathname==='/api/ai/status'&&req.method==='GET'){reply(200,await localStatus());return;}
  if(pathname==='/api/ai/analyze'&&req.method==='POST'){
   if(req.headers.origin!==origin||req.headers['content-type']!=='application/json'){reply(403,{error:'Pedido não autorizado.'});return;}
   if(analyzing){reply(409,{error:'Já existe uma análise em curso. Aguarda.'});return;}
   analyzing=true;
   try{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)throw Error('Print demasiado grande.');chunks.push(chunk);}const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));reply(200,await analyzeLocally({image:body.image,authorization:req.headers.authorization}));}finally{analyzing=false;}return;
  }
  if(pathname==='/api/state'&&req.method==='GET'){reply(200,await readState(directory));return;}
  if(pathname==='/api/save'&&req.method==='POST'){
   if(req.headers.origin!==origin||req.headers['content-type']!=='application/json'){reply(403,{error:'Pedido não autorizado.'});return;}
   if(saving){reply(409,{error:'Está a decorrer outra gravação.'});return;}
   saving=true;
   try{let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>48*1024*1024)throw Error('Guarda menos fotografias de cada vez (limite de 48 MB por pedido).');chunks.push(chunk);}const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));reply(200,await saveState(directory,body));}finally{saving=false;}return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){reply(405,{error:'Método não permitido.'});return;}
  if(pathname.endsWith('/'))pathname+='index.html';
  if(!/^\/(?:index\.html|(?:catalogo|agenda|sobre|contacto|admin)\/index\.html|assets\/vendor\/supabase\.js|assets\/[a-z-]+\.(?:js|css)|data\/(?:catalog|events|unassigned)\.json|images\/[a-zA-Z0-9_./-]+|[a-zA-Z0-9_-]+\.jpeg)$/.test(pathname)||pathname.includes('..')){reply(404,{error:'Página não encontrada.'});return;}
  const file=path.join(directory,pathname.slice(1)),content=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content);
 }catch(e){reply(e.status||(e.code==='ENOENT'?404:400),{error:e.code==='ENOENT'?'Página não encontrada.':e.message});}
});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const server=createServer();server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'O gestor já está aberto em http://127.0.0.1:4173/admin/':e.message);process.exitCode=1;});server.listen(4173,'127.0.0.1',()=>console.log('Site: http://127.0.0.1:4173/\nGestão: http://127.0.0.1:4173/admin/'));}
