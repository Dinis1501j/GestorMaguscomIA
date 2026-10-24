import { el } from './shared.js';
import { logosFor, setButtonLogos, MAX_BUTTON_LOGOS } from './button-logos.js';

export function startButtonLogos({
  getState,
  getCategory,
  getUploads,
  imageSource,
  changed,
  setBusy,
  isBusy,
}) {
  const panel = el('section', { class: 'button-logo-editor' });
  const target = el('select', { 'aria-label': 'Botão a personalizar' });
  const existing = el('select', { 'aria-label': 'Imagem existente para logótipo' });
  const addExisting = el(
    'button',
    { type: 'button', class: 'button' },
    'Usar imagem selecionada',
  );
  const upload = el('input', {
    type: 'file',
    accept: 'image/png,image/webp,image/jpeg',
    multiple: '',
    'aria-label': 'Carregar logótipos',
  });
  const list = el('div');
  const status = el('p', { role: 'status', 'aria-live': 'polite' });
  panel.append(
    el('h2', {}, 'Logótipos dos botões'),
    el(
      'p',
      {},
      'Escolhe a categoria ou uma das suas subcategorias. Podes usar até oito logótipos no mesmo botão. PNG e WebP com fundo transparente ficam melhores. Publica as alterações quando terminares.',
    ),
  );
  for (const [text, control] of [
    ['Botão a personalizar', target],
    ['Imagem existente', existing],
    ['Carregar um ou mais logótipos', upload],
  ]) {
    const label = el('label', {}, text);
    label.append(control);
    panel.append(label);
    if (control === existing) panel.append(addExisting);
  }
  panel.append(list, status);
  document.querySelector('#category-form').after(panel);
  let activeCategory;
  const selectedSubcategory = () => JSON.parse(target.value || 'null');
  const currentImages = () =>
    logosFor(getState().catalog, getCategory()?.id, selectedSubcategory());
  function save(images) {
    const category = getCategory();
    if (!category) return;
    setButtonLogos(getState().catalog, category.id, selectedSubcategory(), images);
    changed();
    render();
    status.textContent =
      'Alteração por publicar. Sem logótipos, o botão volta à imagem automática ou à capa escolhida.';
  }
  function render() {
    list.replaceChildren();
    const images = currentImages();
    images.forEach((file, index) => {
      const row = el('div', { class: 'media-row' });
      row.append(
        el('img', { src: imageSource(file), alt: 'Logótipo ' + (index + 1) }),
        el('span', {}, 'Logótipo ' + (index + 1)),
      );
      for (const [text, offset] of [
        ['↑', -1],
        ['↓', 1],
      ]) {
        const move = el(
          'button',
          {
            type: 'button',
            class: 'button',
            'aria-label':
              offset < 0 ? 'Mover logótipo para cima' : 'Mover logótipo para baixo',
          },
          text,
        );
        move.disabled = index + offset < 0 || index + offset >= images.length;
        move.onclick = () => {
          if (isBusy()) return;
          const next = [...images];
          [next[index], next[index + offset]] = [next[index + offset], next[index]];
          save(next);
        };
        row.append(move);
      }
      const remove = el(
        'button',
        { type: 'button', class: 'button' },
        'Retirar logótipo',
      );
      remove.onclick = () => {
        if (!isBusy()) save(images.filter((_, i) => i !== index));
      };
      row.append(remove);
      list.append(row);
    });
    if (!images.length)
      list.append(
        el(
          'p',
          {},
          'Este botão ainda usa a fotografia de capa ou uma fotografia do produto.',
        ),
      );
  }
  function refresh() {
    const catalog = getState().catalog,
      category = getCategory();
    panel.hidden = !category;
    if (!category) return;
    const previous = activeCategory === category.id ? target.value : 'null';
    activeCategory = category.id;
    const subs = [
      ...new Set(
        catalog.products
          .filter((p) => p.category === category.id)
          .map((p) => (p.subcategory || '').trim()),
      ),
    ];
    target.replaceChildren(
      el('option', { value: 'null' }, 'Categoria: ' + category.name),
      ...subs.map((sub) =>
        el(
          'option',
          { value: JSON.stringify(sub) },
          'Subcategoria: ' + (sub || 'Outros'),
        ),
      ),
    );
    target.value = [...target.options].some((o) => o.value === previous)
      ? previous
      : 'null';
    const pictures = [
      ...new Set([
        ...catalog.products.flatMap((p) => p.images),
        ...catalog.categories.map((c) => c.cover).filter(Boolean),
        ...(catalog.buttonLogos || []).flatMap((item) => item.images),
      ]),
    ];
    existing.replaceChildren(
      el('option', { value: '' }, 'Escolher imagem'),
      ...pictures.map((file) => el('option', { value: file }, file.split('/').pop())),
    );
    render();
  }
  target.onchange = () => {
    status.textContent = '';
    render();
  };
  addExisting.onclick = () => {
    if (isBusy() || !existing.value) return;
    const images = currentImages();
    if (images.length >= MAX_BUTTON_LOGOS) {
      status.textContent = 'Máximo de oito logótipos por botão.';
      return;
    }
    if (!images.includes(existing.value)) save([...images, existing.value]);
  };
  upload.onchange = async () => {
    if (isBusy()) return;
    const files = [...upload.files];
    if (!files.length) return;
    const category = getCategory(),
      subcategory = selectedSubcategory(),
      images = [...currentImages()];
    setBusy(true);
    status.textContent = 'A preparar os logótipos…';
    try {
      if (images.length + files.length > MAX_BUTTON_LOGOS)
        throw Error('Máximo de oito logótipos por botão.');
      const prepared = [];
      for (const file of files) {
        if (
          !['image/png', 'image/webp', 'image/jpeg'].includes(file.type) ||
          file.size > 10 * 1024 * 1024
        )
          throw Error('Usa PNG, WebP ou JPEG até 10 MB por logótipo.');
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = () => reject(Error('Não foi possível ler o logótipo.'));
          reader.readAsDataURL(file);
        });
        const extension = {
          'image/png': 'png',
          'image/webp': 'webp',
          'image/jpeg': 'jpeg',
        }[file.type];
        prepared.push({
          path: 'images/catalogo/uploads/' + crypto.randomUUID() + '.' + extension,
          data,
          type: file.type,
        });
      }
      getUploads().push(...prepared);
      setButtonLogos(getState().catalog, category.id, subcategory, [
        ...images,
        ...prepared.map((u) => u.path),
      ]);
      changed();
      refresh();
      status.textContent =
        'Logótipos prontos. Usa “Publicar alterações” para os mostrar no site.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      setBusy(false);
      upload.value = '';
    }
  };
  return { refresh };
}
