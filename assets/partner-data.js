export const initialPartners = [
  {
    id: 'tp3d-design',
    name: 'TP3D - Design',
    description:
      'Impressão 3D, Modelação 3D, Produtos personalizados e Pintura artesanal',
    linkType: 'instagram',
    url: 'https://www.instagram.com/tp3d.design/',
  },
];
export function partnersOf(catalog) {
  return catalog.partners === undefined
    ? structuredClone(initialPartners)
    : catalog.partners;
}
export function partnerUrl(value) {
  const u = new URL(value);
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password)
    throw Error(
      'Usa um endereço completo de Instagram, Facebook ou website, começado por https://.',
    );
  return u.href;
}
export function validatePartners(partners) {
  if (!Array.isArray(partners) || partners.length > 100)
    throw Error('Lista de parceiros inválida (máximo 100).');
  const ids = new Set();
  for (const p of partners) {
    if (
      !p ||
      typeof p.id !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id) ||
      ids.has(p.id) ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      p.name.length > 180 ||
      typeof p.description !== 'string' ||
      p.description.length > 2000 ||
      !['instagram', 'website', 'facebook'].includes(p.linkType) ||
      typeof p.url !== 'string' ||
      p.url.length > 2048
    )
      throw Error('Verifica o nome, descrição e link dos parceiros.');
    ids.add(p.id);
    try {
      partnerUrl(p.url);
    } catch {
      throw Error(
        'O link de ' + p.name + ' deve começar por https:// ou http:// e ser válido.',
      );
    }
  }
}
