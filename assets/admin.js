import {partnersOf} from './partner-data.js?v=partners3';
import {startAI} from './admin-ai.js?v=online2';
import {asset,el,json} from './shared.js';
import {startLogin} from './admin-login.js';
import {saveOnlineState} from './online-store.js?v=partners3';
let onlineClient;
const $=s=>document.querySelector(s),pf=$('#product-form'),cf=$('#category-form'),ef=$('#event-form');
let state,uploads=[],currentProduct,currentCategory,currentEvent=0,dirty=false,busy=false;
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const unique=(name,items)=>{const base=slug(name)||'novo';let id=base,n=2;while(items.some(x=>x.id===id))id=base+'-'+n++;return id;};
const product=()=>state.catalog.products.find(p=>p.id===currentProduct);
const category=()=>state.catalog.categories.find(c=>c.id===currentCategory);
function message(text,err=false){$('#connection').textContent=text;$('#connection').classList.toggle('error',err);}
function changed(){dirty=true;$('#dirty').textContent='Alterações por guardar';}
function options(select,items,value){select.replaceChildren(...items.map(i=>el('option',{value:i.id},i.name)));select.value=value??items[0]?.id??'';}
function src(file){const u=uploads.find(u=>u.path===file);return u?'data:'+u.type+';base64,'+u.data:asset(file);}
function pictures(){const p=product();$('#image-list').replaceChildren();if(!p)return;p.images.forEach((file,i)=>{const row=el('div',{class:'media-row'});row.append(el('img',{src:src(file),alt:p.name}),el('span',{},i===0?'Capa':`Fotografia ${i+1}`));for(const [text,offset] of [['↑',-1],['↓',1]]){const btn=el('button',{type:'button',class:'button','aria-label':offset<0?'Mover fotografia para cima':'Mover fotografia para baixo'},text);btn.disabled=i+offset<0||i+offset>=p.images.length;btn.onclick=()=>{[p.images[i],p.images[i+offset]]=[p.images[i+offset],p.images[i]];changed();pictures();categoryOptions();};row.append(btn);}const remove=el('button',{type:'button',class:'button'},'Retirar');remove.onclick=()=>{p.images.splice(i,1);changed();pictures();categoryOptions();};row.append(remove);$('#image-list').append(row);});}

function removalOptions(){
 const c=category(),count=state.catalog.products.filter(p=>p.category===c?.id).length;
 const destinations=state.catalog.categories.filter(x=>x.id!==c?.id);
 const select=$('#category-move-target'),previous=select.value;
 options(select,[{id:'',name:'Escolher categoria de destino'},...destinations],destinations.some(x=>x.id===previous)?previous:'');
 $('#category-move-label').hidden=!count;
 $('#category-removal-info').textContent=!count?'Esta categoria está vazia. A remoção só fica visível depois de publicar.':destinations.length?count+' peça(s) nesta categoria. Escolhe para onde as mover antes de remover.':'Esta categoria tem peças. Cria outra categoria para as receber antes de remover.';
 $('#delete-category').disabled=!c||(count>0&&!destinations.length);
}

function categoryOptions(){const value=pf.elements.category.value||product()?.category;options(pf.elements.category,state.catalog.categories,value);const c=category();const photos=[...new Set(state.catalog.products.filter(p=>p.category===c?.id).flatMap(p=>p.images))];if(c?.cover&&!photos.includes(c.cover))photos.push(c.cover);options(cf.elements.cover,[{id:'',name:'Automática (primeira peça)'},...photos.map(f=>({id:f,name:f.split('/').pop()}))],c?.cover||'');removalOptions();}
function loadProduct(){const p=product();pf.hidden=!p;if(!p)return;for(const field of ['name','price','subcategory','description'])pf.elements[field].value=p[field];categoryOptions();pf.elements.category.value=p.category;pictures();}
function loadCategory(){const c=category();cf.hidden=!c;if(!c)return;cf.elements.name.value=c.name;categoryOptions();}
function loadEvent(){const e=state.events[currentEvent];ef.hidden=!e;if(!e)return;for(const f of ['title','date','time','location','description'])ef.elements[f].value=e[f];}
function selectors(){options($('#product-picker'),state.catalog.products,currentProduct);options($('#category-picker'),state.catalog.categories,currentCategory);options($('#event-picker'),state.events.map((e,i)=>({id:String(i),name:e.title})),String(currentEvent));}
pf.addEventListener('input',e=>{const p=product();if(p&&['name','price','category','subcategory','description'].includes(e.target.name)){p[e.target.name]=e.target.value;changed();selectors();if(e.target.name==='category')categoryOptions();}});
cf.addEventListener('input',e=>{const c=category();if(c&&['name','cover'].includes(e.target.name)){c[e.target.name]=e.target.value;changed();selectors();categoryOptions();}});
ef.addEventListener('input',e=>{if(state.events[currentEvent]&&['title','date','time','location','description'].includes(e.target.name)){state.events[currentEvent][e.target.name]=e.target.value;changed();selectors();}});
for(const form of [pf,cf,ef])form.addEventListener('submit',e=>{e.preventDefault();message('Alteração aplicada. Usa “Publicar alterações” para atualizar o site.');});
$('#product-picker').onchange=e=>{currentProduct=e.target.value;loadProduct();};$('#category-picker').onchange=e=>{currentCategory=e.target.value;loadCategory();};$('#event-picker').onchange=e=>{currentEvent=Number(e.target.value);loadEvent();};
$('#new-product').onclick=()=>{if(!state.catalog.categories.length){message('Cria primeiro uma categoria.',true);return;}const p={id:unique('nova-peca',state.catalog.products),name:'Nova peça',price:'??€',category:currentCategory||state.catalog.categories[0].id,subcategory:'',description:'',images:[]};state.catalog.products.push(p);currentProduct=p.id;changed();selectors();loadProduct();pf.elements.name.focus();};
$('#new-category').onclick=()=>{const c={id:unique('nova-categoria',state.catalog.categories),name:'Nova categoria',cover:''};state.catalog.categories.push(c);currentCategory=c.id;changed();selectors();loadCategory();cf.elements.name.focus();};
$('#new-event').onclick=()=>{state.events.push({title:'Novo evento',date:'',time:'',location:'',description:''});currentEvent=state.events.length-1;changed();selectors();loadEvent();ef.elements.title.focus();};
$('#delete-product').onclick=()=>{const p=product();if(!p||!confirm('Remover “'+p.name+'” do catálogo? A fotografia permanece guardada.'))return;state.catalog.products=state.catalog.products.filter(x=>x.id!==p.id);currentProduct=state.catalog.products[0]?.id;changed();selectors();loadProduct();categoryOptions();};

$('#delete-category').onclick=()=>{
 if(busy)return;
 const c=category();if(!c)return;
 const pieces=state.catalog.products.filter(p=>p.category===c.id);
 const destination=state.catalog.categories.find(x=>x.id===$('#category-move-target').value&&x.id!==c.id);
 if(pieces.length&&!destination){message('Escolhe uma categoria de destino para preservar as peças.',true);return;}
 const question=pieces.length?'Mover '+pieces.length+' peça(s) para “'+destination.name+'” e remover a categoria “'+c.name+'”?':'Remover a categoria vazia “'+c.name+'”?';
 if(!confirm(question+' A alteração só fica visível depois de publicar.'))return;
 for(const p of pieces)p.category=destination.id;
 state.catalog.categories=state.catalog.categories.filter(x=>x.id!==c.id);
 currentCategory=destination?.id||state.catalog.categories[0]?.id;
 changed();selectors();loadProduct();loadCategory();categoryOptions();
 message('Categoria removida'+(pieces.length?' e peças movidas para “'+destination.name+'”':'')+'. Usa “Publicar alterações” para atualizar o site.');
};

$('#delete-event').onclick=()=>{if(!confirm('Remover este evento?'))return;state.events.splice(currentEvent,1);currentEvent=0;changed();selectors();loadEvent();};
$('#upload').onchange=async e=>{const p=product();if(!p)return;busy=true;$('#save').disabled=true;try{for(const file of e.target.files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Usa JPEG, PNG ou WebP até 10 MB por fotografia.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(Error('Não foi possível ler a fotografia.'));r.readAsDataURL(file);});const ext={'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'}[file.type];const filePath='images/catalogo/uploads/'+crypto.randomUUID()+'.'+ext;uploads.push({path:filePath,data,type:file.type});p.images.push(filePath);changed();}pictures();categoryOptions();message('Fotografias adicionadas. Guarda as alterações quando terminares.');}catch(e){message(e.message,true);pictures();}finally{busy=false;$('#save').disabled=false;$('#upload').value='';}};
$('#save').onclick=async()=>{if(busy)return;busy=true;$('#editor').inert=true;message('A publicar…');try{state=await saveOnlineState(onlineClient,state,uploads);uploads=[];dirty=false;$('#dirty').textContent='Tudo publicado';pictures();categoryOptions();message('Publicado online. As alterações aparecem no site ao abrir ou atualizar a página.');}catch(e){message(e.message,true);}finally{busy=false;$('#editor').inert=false;}};
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});

const partnerForm=$('#partner-form');let currentPartner;
function loadPartner(){const p=state.catalog.partners.find(x=>x.id===currentPartner);partnerForm.hidden=!p;if(p)for(const key of ['name','description','linkType','url'])partnerForm.elements[key].value=p[key];}
function partnerSelectors(){options($('#partner-picker'),state.catalog.partners,currentPartner);}
$('#partner-picker').onchange=e=>{currentPartner=e.target.value;loadPartner();};
$('#new-partner').onclick=()=>{if(busy)return;if(state.catalog.partners.length>=100){message('Máximo de 100 parceiros.',true);return;}const p={id:unique('novo-parceiro',state.catalog.partners),name:'Novo parceiro',description:'',linkType:'instagram',url:''};state.catalog.partners.push(p);currentPartner=p.id;changed();partnerSelectors();loadPartner();partnerForm.elements.name.focus();};
partnerForm.oninput=e=>{const p=state.catalog.partners.find(x=>x.id===currentPartner);if(p&&['name','description','linkType','url'].includes(e.target.name)){p[e.target.name]=e.target.value;changed();partnerSelectors();}};
partnerForm.onsubmit=e=>{e.preventDefault();message('Parceiro aplicado. Usa “Publicar alterações” para atualizar o site.');};
$('#delete-partner').onclick=()=>{if(busy)return;const p=state.catalog.partners.find(x=>x.id===currentPartner);if(!p||!confirm('Remover o parceiro “'+p.name+'”? Só fica visível depois de publicar.'))return;state.catalog.partners=state.catalog.partners.filter(x=>x.id!==p.id);currentPartner=state.catalog.partners[0]?.id;changed();partnerSelectors();loadPartner();};

try{
 const signed=await startLogin((completed=false)=>{if(completed){dirty=false;return true;}if(busy){message('Aguarda até terminar a operação.',true);return false;}if(dirty&&!confirm('Existem alterações por publicar. Queres sair e descartá-las?'))return false;return true;}); onlineClient=signed.client;state=signed.state;state.catalog.partners=partnersOf(state.catalog);currentPartner=state.catalog.partners[0]?.id;partnerSelectors();loadPartner();currentProduct=state.catalog.products[0]?.id;currentCategory=state.catalog.categories[0]?.id;selectors();loadProduct();loadCategory();loadEvent();$('#editor').hidden=false;message('Sessão iniciada. Publica quando terminares as alterações.');
 startAI({client:onlineClient,getState:()=>state,setBusy:value=>{busy=value;$('#save').disabled=value;$('.admin-columns').inert=value;},addProducts:items=>{for(const item of items){const images=item.photos.map(photo=>{const path='images/catalogo/uploads/'+crypto.randomUUID()+'.jpeg';uploads.push({path,type:'image/jpeg',data:photo.split(',')[1]});return path;});const p={id:unique(item.name,state.catalog.products),name:item.name,price:item.price,category:item.category,subcategory:'',description:'',images};state.catalog.products.push(p);currentProduct=p.id;}changed();selectors();loadProduct();categoryOptions();}});
 const exportBtn=el('button',{class:'button',type:'button'},'Exportar cópia');exportBtn.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({...state,uploads},null,2)],{type:'application/json'}));const link=el('a',{href:url,download:'magus-art-edicao.json'});link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('.toolbar').append(exportBtn);
 for(const file of await json('data/unassigned.json')){const row=el('div',{class:'media-row'}),btn=el('button',{class:'button',type:'button'},'Associar à peça');row.append(el('img',{src:asset(file),alt:file,loading:'lazy'}),el('span',{},file),btn);btn.onclick=()=>{const p=product();if(!p){message('Escolhe ou cria uma peça primeiro.',true);return;}if(!p.images.includes(file)){p.images.push(file);changed();pictures();categoryOptions();message('Fotografia associada a '+p.name+'.');}};$('#unassigned').append(row);}
}catch(e){message(e.message,true);}
