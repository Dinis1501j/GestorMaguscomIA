import { el, json, error } from './shared.js?v=online1';
const grid = document.querySelector('#events-grid');
try {
  const events = await json('data/events.json');
  grid.replaceChildren();
  for (const e of events) {
    const card = el('article', { class: 'event-card' });
    card.append(
      el('h2', {}, e.title),
      el('p', {}, '📅 ' + e.date),
      el('p', {}, '🕐 ' + e.time),
      el('p', {}, '📍 ' + e.location),
      el('p', {}, e.description),
    );
    grid.append(card);
  }
  if (!events.length) grid.append(el('p', {}, 'Novos eventos em breve.'));
} catch (e) {
  error(grid, e);
}
