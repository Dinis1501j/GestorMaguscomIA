export function validateAnalysis(value, categories) {
  if (!Array.isArray(value?.products) || !value.products.length || value.products.length > 12) throw Error('A IA não identificou produtos válidos. Tenta uma print mais nítida.');
  const ids = new Set(categories.map(c => c.id));
  for (const p of value.products) {
    if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 180 || !ids.has(p.category) || typeof p.price !== 'string' || p.price.length > 60) throw Error('A análise devolveu dados inválidos.');
    if (!Array.isArray(p.photos) || !p.photos.length || p.photos.length > 10) throw Error('Não foram identificadas fotografias.');
    for (const r of p.photos) if (!['x','y','width','height'].every(k => Number.isFinite(r[k])) || r.x < 0 || r.y < 0 || r.width <= 0 || r.height <= 0 || r.x+r.width > 1.001 || r.y+r.height > 1.001) throw Error('O recorte sugerido está fora da imagem.');
  }
  return value;
}
