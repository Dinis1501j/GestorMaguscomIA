const normalized=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function validateIdentification(value,categories,subcategories,multiple=false){
  if(!Array.isArray(value?.produtos)||!value.produtos.length||value.produtos.length>8||(!multiple&&value.produtos.length!==1))throw Error('A IA devolveu um número de produtos inválido.');
  for(const p of value.produtos){
    for(const field of ['nome','categoria','subcategoria'])if(typeof p[field]!=='string'||p[field].length>180)throw Error('A IA devolveu campos inválidos.');
    if(!p.nome.trim())throw Error('Não foi possível identificar o produto.');
    const category=categories.find(c=>normalized(c.name)===normalized(p.categoria)||c.id===p.categoria);
    p.categoria=category?.name||'';
    p.subcategoria=subcategories.find(s=>normalized(s)===normalized(p.subcategoria))||p.subcategoria.trim();
  }
  return value;
}
