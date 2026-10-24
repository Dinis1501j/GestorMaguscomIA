const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#menu');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('open', open);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
  }
});
menu.addEventListener('click', () => {
  toggle.setAttribute('aria-expanded', 'false');
  menu.classList.remove('open');
});
if (document.body.dataset.page === 'home') {
  const destinations = {
    galeria: 'catalogo/',
    sobre: 'sobre/',
    processo: 'sobre/#processo',
    contacto: 'contacto/',
    agenda: 'agenda/',
    parceiros: 'contacto/#parceiros',
  };
  const redirect = () => {
    const next = destinations[location.hash.slice(1)];
    if (next) location.replace(new URL(next, location.href));
  };
  redirect();
  window.addEventListener('hashchange', redirect);
}
