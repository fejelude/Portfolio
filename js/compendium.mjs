import { COMPENDIUM_ITEMS } from './compendium-data.mjs';

const grid = document.getElementById('compendium-grid');
const empty = document.getElementById('compendium-empty');
const dialog = document.getElementById('compendium-lightbox');
const large = document.getElementById('compendium-large');
const caption = document.getElementById('compendium-caption');
const count = document.getElementById('compendium-count');
const closeButton = document.getElementById('compendium-close');
const previousButton = document.getElementById('compendium-prev');
const nextButton = document.getElementById('compendium-next');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let activeIndex = 0;
let trigger = null;
let closingTimer = 0;

const updateImage = index => {
  activeIndex = (index + COMPENDIUM_ITEMS.length) % COMPENDIUM_ITEMS.length;
  const item = COMPENDIUM_ITEMS[activeIndex];
  dialog.classList.toggle('compendium__lightbox--red', item.template === 'red');
  large.src = item.full;
  large.alt = item.caption || `Compendium image ${activeIndex + 1}`;
  large.width = item.width;
  large.height = item.height;
  caption.textContent = item.caption || '';
  caption.hidden = !item.caption;
  count.textContent = `${activeIndex + 1} / ${COMPENDIUM_ITEMS.length}`;
  previousButton.hidden = nextButton.hidden = COMPENDIUM_ITEMS.length < 2;
};

const openImage = (index, button) => {
  if (!COMPENDIUM_ITEMS.length) return;
  clearTimeout(closingTimer);
  dialog.classList.remove('is-closing');
  trigger = button;
  updateImage(index);
  dialog.showModal();
  closeButton.focus();
};

const closeImage = () => {
  if (!dialog.open || dialog.classList.contains('is-closing')) return;
  if (reducedMotion) { dialog.close(); return; }
  dialog.classList.add('is-closing');
  closingTimer = setTimeout(() => dialog.close(), 170);
};

COMPENDIUM_ITEMS.forEach((item, index) => {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = `compendium__card${item.template === 'red' ? ' compendium__card--red' : ''}`;
  card.style.setProperty('--tilt', `${[-1.2, .9, -.5, 1, -1, .6][index % 6]}deg`);
  card.setAttribute('aria-label', `Open image ${index + 1} of ${COMPENDIUM_ITEMS.length}${item.caption ? `: ${item.caption}` : ''}`);
  const frame = document.createElement('span');
  frame.className = `compendium__frame${item.template === 'red' ? ' compendium__frame--red' : ''}`;
  const image = document.createElement('img');
  image.src = item.thumb;
  image.alt = item.caption || `Compendium image ${index + 1}`;
  image.width = item.width;
  image.height = item.height;
  image.loading = index < 3 ? 'eager' : 'lazy';
  image.decoding = 'async';
  frame.append(image);
  const footer = document.createElement('span');
  footer.className = 'compendium__card-footer';
  if (item.caption) {
    const note = document.createElement('span');
    note.className = 'compendium__card-caption';
    note.textContent = item.caption;
    footer.append(note);
  }
  const number = document.createElement('span');
  number.className = 'compendium__card-index';
  number.textContent = String(index + 1).padStart(2, '0');
  footer.append(number);
  card.append(frame, footer);
  card.addEventListener('click', () => openImage(index, card));
  grid.append(card);
});

empty.hidden = COMPENDIUM_ITEMS.length > 0;
closeButton.addEventListener('click', closeImage);
previousButton.addEventListener('click', () => updateImage(activeIndex - 1));
nextButton.addEventListener('click', () => updateImage(activeIndex + 1));
dialog.addEventListener('cancel', event => { event.preventDefault(); closeImage(); });
dialog.addEventListener('click', event => { if (event.target === dialog) closeImage(); });
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') { event.preventDefault(); updateImage(activeIndex + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); updateImage(activeIndex - 1); }
});
dialog.addEventListener('close', () => {
  clearTimeout(closingTimer);
  dialog.classList.remove('is-closing');
  large.removeAttribute('src');
  trigger?.focus();
});
