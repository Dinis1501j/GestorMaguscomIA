import { el } from './shared.js';
import { refinePhotoColumns } from './ai-crops.js';
import { validatePhotoRegions } from './ai-photo-regions.js';
import { splitPhotoPanels } from './ai-photo-panels.js';

export async function createPhotoReview(card, product, sources) {
  let regions = validatePhotoRegions(product, sources.length, true).map((r) => ({
    ...r,
  }));
  const images = await Promise.all(
    sources.map(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return image;
    }),
  );
  for (const [index, image] of images.entries()) {
    let subset = regions.filter((r) => r.imagem === index);
    const canvas = document.createElement('canvas'),
      scale = Math.min(1, 600 / image.naturalWidth);
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (subset.length === 1) {
      const split = splitPhotoPanels(pixels, subset[0]);
      regions = regions.flatMap((r) => (r === subset[0] ? split : [r]));
      subset = split;
    }
    if (subset.length < 2) continue;
    const refined = refinePhotoColumns(pixels, subset);
    refined.forEach((r, i) => Object.assign(subset[i], r));
  }
  card.append(
    el('h3', {}, 'Fotografias deste produto'),
    el(
      'p',
      {},
      'Confirma as fotos separadas. Podes ajustar os recortes e retirar fotos repetidas.',
    ),
  );
  const reviews = regions.map((region, index) => {
    const row = el('div', { class: 'ai-photo' }),
      img = el('img', { alt: 'Fotografia ' + (index + 1) }),
      keep = el('input', { type: 'checkbox', checked: '' });
    const label = el(
      'label',
      {},
      'Incluir foto ' + (index + 1) + ' (imagem enviada ' + (region.imagem + 1) + ')',
    );
    label.prepend(keep);
    const controls = {};
    function render() {
      const crop = { imagem: region.imagem };
      for (const key of ['x', 'y', 'width', 'height'])
        crop[key] = Number(controls[key].value) / 100;
      try {
        if (Object.values(controls).some((c) => !c.value.trim())) throw Error();
        validatePhotoRegions({ fotos: [crop] }, sources.length);
        const image = images[crop.imagem],
          x = Math.round(crop.x * image.naturalWidth),
          y = Math.round(crop.y * image.naturalHeight);
        const w = Math.min(
            image.naturalWidth - x,
            Math.round(crop.width * image.naturalWidth),
          ),
          h = Math.min(
            image.naturalHeight - y,
            Math.round(crop.height * image.naturalHeight),
          );
        if (w < 1 || h < 1) throw Error();
        const canvas = document.createElement('canvas'),
          scale = Math.min(1, 1600 / Math.max(w, h));
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        canvas
          .getContext('2d')
          .drawImage(image, x, y, w, h, 0, 0, canvas.width, canvas.height);
        img.src = canvas.toDataURL('image/jpeg', 0.9);
        row.removeAttribute('data-invalid');
      } catch {
        img.removeAttribute('src');
        row.setAttribute('data-invalid', 'true');
      }
    }
    row.append(img, label);
    for (const [key, title] of [
      ['x', 'Esquerda %'],
      ['y', 'Topo %'],
      ['width', 'Largura %'],
      ['height', 'Altura %'],
    ]) {
      const control = el('input', {
        type: 'number',
        min: 0,
        max: 100,
        step: 0.1,
        value: Math.round(region[key] * 1000) / 10,
        'aria-label': title + ' da foto ' + (index + 1),
      });
      controls[key] = control;
      control.oninput = render;
      const label = el('label', {}, title);
      label.append(control);
      row.append(label);
    }
    render();
    card.append(row);
    return { img, keep };
  });
  return () => {
    const selected = reviews.filter((r) => r.keep.checked);
    if (!selected.length) throw Error('Inclui pelo menos uma fotografia do produto.');
    if (selected.some((r) => !r.img.getAttribute('src')))
      throw Error('Corrige os recortes inválidos antes de adicionar.');
    return selected.map((r) => r.img.getAttribute('src'));
  };
}
