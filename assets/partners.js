import { json, el, error } from './shared.js';
import { partnersOf, validatePartners, partnerUrl } from './partner-data.js?v=partners3';
const grid = document.querySelector('#partner-list');
try {
  const partners = partnersOf(await json('data/catalog.json'));
  validatePartners(partners);
  grid.replaceChildren(
    ...partners.map((p) => {
      const card = el('div', { class: 'partner-card' });
      card.append(
        el('h3', {}, p.name),
        el('p', {}, p.description),
        el(
          'a',
          {
            href: partnerUrl(p.url),
            target: '_blank',
            rel: 'noopener noreferrer',
            class: 'partner-instagram',
          },
          p.linkType === 'instagram'
            ? 'Instagram'
            : p.linkType === 'facebook'
              ? 'Facebook'
              : 'Visitar website',
        ),
      );
      return card;
    }),
  );
  if (!partners.length) grid.append(el('p', {}, 'Ainda não há parceiros publicados.'));
} catch (e) {
  error(grid, e);
}
