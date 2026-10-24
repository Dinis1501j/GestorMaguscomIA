// Optional button artwork; product/category records keep their existing format.
export const MAX_BUTTON_LOGOS = 8;

export function logosFor(catalog, category, subcategory = null) {
  const entry = (catalog.buttonLogos || []).find(
    (item) => item.category === category && item.subcategory === subcategory,
  );
  return Array.isArray(entry?.images) ? entry.images : [];
}

export function setButtonLogos(catalog, category, subcategory, images) {
  const entries = (catalog.buttonLogos || []).filter(
    (item) => item.category !== category || item.subcategory !== subcategory,
  );
  if (images.length) entries.push({ category, subcategory, images: [...images] });
  catalog.buttonLogos = entries;
}

export function logoReferences(catalog) {
  return (catalog.buttonLogos || []).flatMap((item) => item.images);
}

export function replaceLogoReference(catalog, before, after) {
  for (const entry of catalog.buttonLogos || []) {
    entry.images = entry.images.map((image) => (image === before ? after : image));
  }
}

export function validateButtonLogos(catalog, validImage) {
  if (catalog.buttonLogos === undefined) return;
  if (!Array.isArray(catalog.buttonLogos) || catalog.buttonLogos.length > 1000)
    throw Error('Lista de logótipos inválida.');
  const keys = new Set();
  for (const entry of catalog.buttonLogos) {
    if (
      !entry ||
      !catalog.categories.some((c) => c.id === entry.category) ||
      !(
        entry.subcategory === null ||
        (typeof entry.subcategory === 'string' && entry.subcategory.length <= 180)
      ) ||
      !Array.isArray(entry.images) ||
      !entry.images.length ||
      entry.images.length > MAX_BUTTON_LOGOS ||
      entry.images.some((image) => !validImage(image))
    )
      throw Error('Verifica os logótipos dos botões.');
    const key = JSON.stringify([entry.category, entry.subcategory]);
    if (keys.has(key)) throw Error('Botão com logótipos repetido.');
    keys.add(key);
  }
}
