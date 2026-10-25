export function validatePhotoRegions(product, imageCount, requireAll = false) {
  if (!Array.isArray(product.fotos) || !product.fotos.length || product.fotos.length > 48)
    throw Error('A IA não identificou fotografias válidas.');
  for (const region of product.fotos) {
    if (
      !region ||
      !Number.isInteger(region.imagem) ||
      region.imagem < 0 ||
      region.imagem >= imageCount ||
      !['x', 'y', 'width', 'height'].every((key) => Number.isFinite(region[key])) ||
      region.x < 0 ||
      region.y < 0 ||
      region.width <= 0 ||
      region.height <= 0 ||
      region.x + region.width > 1.001 ||
      region.y + region.height > 1.001
    )
      throw Error('A IA sugeriu um recorte inválido.');
  }
  if (requireAll && new Set(product.fotos.map((r) => r.imagem)).size !== imageCount)
    throw Error('Faltam fotografias de uma das imagens enviadas. Volta a analisar.');
  return product.fotos;
}

export function photoGroups(images, mode) {
  return mode === 'separate' ? images.map((image) => [image]) : [[...images]];
}
