import {el} from './shared.js';
import {validateAnalysis} from './ai-contract.js';
import {refinePhotoColumns} from './ai-crops.js';

export function startAI({client, getState, addProducts, setBusy}) {
  const panel = el('section', {class:'ai-panel'});
  const heading = el('h2', {}, 'Importar produtos com IA');
  const local=location.hostname==='127.0.0.1';
  const intro = el('p', {}, 'Carrega ou cola uma print. A IA local gratuita lê o preço, pesquisa o nome e separa as fotografias do mesmo produto. Revê os recortes e os dados antes de adicionar.');
  const input = el('input', {type:'file', accept:'image/jpeg,image/png,image/webp', 'aria-label':'Print do produto'});
  const analyze = el('button', {type:'button',class:'button'}, 'Analisar print');
  const status = el('p', {role:'status','aria-live':'polite'});
  const results = el('div');
  const preview = el('img', {alt:'Print a analisar',class:'ai-preview',hidden:true});
  panel.append(heading,intro,input,preview,analyze,status,results);
  if(!local){input.disabled=true;analyze.disabled=true;status.textContent='Para usar a IA gratuita, abre Abrir-gestor.cmd no computador e visita http://127.0.0.1:4173/admin/. O gestor manual continua disponível aqui.';return document.querySelector('#editor .toolbar').after(panel);}
  document.querySelector('#editor .toolbar').after(panel);
  let image, dataUrl, working=false, selecting=false;
  fetch('/api/ai/status').then(r=>r.json()).then(s=>{if(!image&&!selecting&&!working)status.textContent=s.available?(s.installed?'IA local pronta. Carrega ou cola uma print.':'Falta o modelo local. Executa: ollama pull '+s.model):'Abre o Ollama para usar a IA local gratuita.';}).catch(()=>{if(!image)status.textContent='Abre o gestor com Abrir-gestor.cmd para usar a IA local.';});
  async function select(file) {
    if(working||selecting)return;
    selecting=true;analyze.disabled=true;
    results.replaceChildren(); image=null; dataUrl=null; preview.hidden=true;
    try {
      if(!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10*1024*1024) throw Error('Escolhe uma print JPEG, PNG ou WebP até 10 MB.');
      const url=URL.createObjectURL(file);
      try {image=new Image();image.src=url;await image.decode();} finally {URL.revokeObjectURL(url);}
      if(image.naturalWidth*image.naturalHeight>40000000)throw Error('A imagem é demasiado grande. Reduz a resolução.');
      const canvas=document.createElement('canvas'),scale=Math.min(1,2200/Math.max(image.naturalWidth,image.naturalHeight));
      canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      dataUrl=canvas.toDataURL('image/jpeg',0.9);preview.src=dataUrl;preview.hidden=false;
      status.textContent='Print pronta. A imagem é analisada no teu computador pelo Ollama, sem API paga. Só o nome identificado é enviado ao motor de pesquisa na internet.';
    }catch(e){image=null;status.textContent=e.message;}finally{selecting=false;analyze.disabled=false;}
  }
  input.onchange=()=>select(input.files[0]);
  panel.tabIndex=0;
  panel.addEventListener('paste',e=>{const file=[...e.clipboardData.items].find(i=>i.kind==='file')?.getAsFile();if(file){e.preventDefault();select(file);}});
  analyze.onclick=async()=>{
    if(working)return;
    if(!dataUrl || !image){status.textContent='Carrega primeiro uma print.';return;}
    working=true;setBusy(true);analyze.disabled=true;input.disabled=true;results.replaceChildren();status.textContent='A analisar fotografias, preço e nome na internet…';
    try {
      const session=await client.auth.getSession();
      if(!session.data.session)throw Error('Inicia sessão para usar a IA.');
      const response=await fetch('/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.data.session.access_token},body:JSON.stringify({image:dataUrl})});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'Não foi possível analisar. Confirma que o Ollama está aberto.');
      const analysis=validateAnalysis(data,getState().catalog.categories);
      if(analysis.products.length===1){const canvas=document.createElement('canvas'),scale=Math.min(1,600/image.naturalWidth);canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,canvas.width,canvas.height);analysis.products[0].photos=refinePhotoColumns(ctx.getImageData(0,0,canvas.width,canvas.height),analysis.products[0].photos);}
      const drafts=[];
      for(const p of analysis.products){
        const card=el('fieldset',{class:'ai-card'});card.append(el('legend',{},'Produto identificado'));
        const include=el('input',{type:'checkbox',checked:true}),includeLabel=el('label',{},'Adicionar este produto');includeLabel.append(include);card.append(includeLabel);
        const name=el('input',{value:p.name,maxlength:180}),price=el('input',{value:p.price,maxlength:60}),category=el('select');
        for(const c of getState().catalog.categories) category.append(el('option',{value:c.id},c.name));category.value=p.category;
        for(const [title,control] of [['Nome',name],['Preço',price],['Categoria',category]]){const label=el('label',{},title);label.append(control);card.append(label);}
        card.append(el('p',{},p.notes||'Confirma o nome, o preço e os recortes.'));
        const photos=[];
        for(const r of p.photos){
          const row=el('div',{class:'ai-photo'}),img=el('img',{alt:'Fotografia recortada'}),keep=el('input',{type:'checkbox',checked:true});
          const controls={};
          const render=()=>{const crop={};for(const key of ['x','y','width','height'])crop[key]=Number(controls[key].value)/100;const canvas=document.createElement('canvas');const x=Math.round(crop.x*image.naturalWidth),y=Math.round(crop.y*image.naturalHeight),w=Math.min(image.naturalWidth-x,Math.round(crop.width*image.naturalWidth)),h=Math.min(image.naturalHeight-y,Math.round(crop.height*image.naturalHeight));if(w<1||h<1){img.removeAttribute('src');return;}const scale=Math.min(1,1600/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));canvas.getContext('2d').drawImage(image,x,y,w,h,0,0,canvas.width,canvas.height);img.src=canvas.toDataURL('image/jpeg',0.92);};
          const label=el('label',{},'Incluir fotografia');label.append(keep);row.append(img,label);
          for(const [key,title] of [['x','Esquerda %'],['y','Topo %'],['width','Largura %'],['height','Altura %']]){const label=el('label',{},title),control=el('input',{type:'number',min:0,max:100,step:0.1,value:Math.round(r[key]*1000)/10});controls[key]=control;control.oninput=render;label.append(control);row.append(label);}
          render();photos.push({keep,img});card.append(row);
        }
        drafts.push({name,price,category,photos,include});results.append(card);
      }
      if(Array.isArray(data.sources))for(const source of data.sources){try{const url=new URL(source.url);if(url.protocol==='https:'||url.protocol==='http:')results.append(el('a',{href:url.href,target:'_blank',rel:'noopener noreferrer'},source.title||url.hostname),el('br'));}catch{}}
      const add=el('button',{type:'button',class:'button'},'Adicionar ao gestor para publicar');
      add.onclick=()=>{try{const products=drafts.filter(d=>d.include.checked).map(d=>{const photos=d.photos.filter(p=>p.keep.checked).map(p=>p.img.getAttribute('src')).filter(Boolean);if(!d.name.value.trim()||!d.price.value.trim()||!photos.length)throw Error('Preenche nome e preço e inclui pelo menos uma fotografia por produto.');return {name:d.name.value.trim(),price:d.price.value.trim(),category:d.category.value,photos};});if(!products.length)throw Error('Seleciona pelo menos um produto para adicionar.');addProducts(products);results.replaceChildren();status.textContent='Produtos adicionados ao gestor. Podes corrigir todos os dados e usar “Publicar alterações”.';}catch(e){status.textContent=e.message;}};
      results.append(add);status.textContent='Análise concluída. Revê os dados, as fontes e os recortes. Preço ilegível fica como ??€; preços da internet não substituem o teu preço.';
    }catch(e){status.textContent=e.message;}finally{working=false;setBusy(false);analyze.disabled=false;input.disabled=false;}
  };
}
