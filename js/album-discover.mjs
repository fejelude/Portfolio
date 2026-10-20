import { DISCOVER, songDestination } from './album-discover-config.mjs';

const svgNS = 'http://www.w3.org/2000/svg';
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
function medal(rank) {
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 48'); svg.setAttribute('aria-hidden', 'true');
  const ribbon = document.createElementNS(svgNS, 'path');
  ribbon.setAttribute('d', 'M9 23H20V45L14 40L8 45ZM20 23H31L32 45L26 40L20 45Z');
  ribbon.setAttribute('fill', '#df9db9');
  const seal = document.createElementNS(svgNS, 'path');
  seal.setAttribute('d', 'M12 2H28V6H34V12H38V28H34V34H28V38H12V34H6V28H2V12H6V6H12Z');
  seal.setAttribute('fill', 'var(--medal-fill)'); seal.setAttribute('stroke', 'var(--medal-ink)'); seal.setAttribute('stroke-width', '2');
  const number = document.createElementNS(svgNS, 'text');
  number.setAttribute('x', '20'); number.setAttribute('y', '26'); number.setAttribute('text-anchor', 'middle');
  number.setAttribute('fill', 'var(--medal-ink)'); number.textContent = rank;
  svg.append(ribbon, seal, number); return svg;
}

function cardFor(slot) {
  const item = element('li', 'discover__item');
  const card = element('details', `discover__card${slot.rank < 4 ? ` discover__card--${['gold', 'silver', 'bronze'][slot.rank - 1]}` : ''}`);
  card.dataset.rank = slot.rank;
  const summary = element('summary', 'discover__summary');
  const rank = element('span', 'discover__rank');
  if (slot.rank < 4) rank.append(medal(slot.rank)); else rank.textContent = String(slot.rank).padStart(2, '0');
  rank.setAttribute('aria-hidden', 'true');
  const art = element('span', 'discover__art');
  const imageURL = songDestination(slot.artwork, document.baseURI);
  if (imageURL) {
    const image = element('img'); image.src = imageURL; image.alt = ''; image.loading = 'lazy'; image.width = image.height = 72; art.append(image);
  } else { art.classList.add('discover__art--empty'); art.setAttribute('aria-hidden', 'true'); art.append(element('span', '', '♡')); }
  const info = element('span', 'discover__info');
  info.append(element('span', 'discover__position', `TOP ${slot.rank}${slot.rank < 4 ? ` · ${['GOLD', 'SILVER', 'BRONZE'][slot.rank - 1]}` : ''}`),
    element('span', 'discover__title', slot.title || `Top ${slot.rank} — Coming Soon`),
    element('span', 'discover__artist', slot.artist || 'artist to be added'));
  const expand = element('span', 'discover__expand', '+'); expand.setAttribute('aria-hidden', 'true');
  summary.append(rank, art, info, expand);
  const body = element('div', 'discover__body');
  const media = element('div', 'discover__media');
  const destination = songDestination(slot.link, document.baseURI);
  if (slot.audio && songDestination(slot.audio, document.baseURI)) {
    const play = element('button', 'discover__listen', 'play in player ♫');
    play.type = 'button'; play.dataset.discoveryId = `discover-${String(slot.rank).padStart(2, '0')}`;
    play.setAttribute('aria-pressed', 'false');
    play.addEventListener('click', () => document.dispatchEvent(new CustomEvent('album:select-discovery', { detail: { id: play.dataset.discoveryId } })));
    media.append(play);
  } else if (destination) {
    const link = element('a', 'discover__song-link', 'open song ↗'); link.href = destination; link.target = '_blank'; link.rel = 'noopener noreferrer'; media.append(link);
  } else media.append(element('p', 'discover__pending', 'audio / song link — to be added'));
  body.append(media, element('h3', 'discover__note-heading', 'why this song ♡'),
    element('p', 'discover__description', slot.description || (slot.title ? 'coming soon ♡' : 'description to be added')));
  card.append(summary, body); item.append(card); return item;
}

export function installSixSeven(button, stage, platform = window) {
  if (!button || !stage) return;
  const life = new AbortController(), options = { signal: life.signal };
  let timer = 0;
  const stop = () => {
    platform.clearTimeout(timer); timer = 0;
    stage.classList.remove('is-running'); stage.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };
  button.addEventListener('click', () => {
    stop(); stage.hidden = false;
    // Restart the finite CSS performance on repeat taps, without adding nodes.
    stage.getBoundingClientRect(); stage.classList.add('is-running');
    button.setAttribute('aria-expanded', 'true');
    timer = platform.setTimeout(stop, 3200);
  }, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, options);
  platform.addEventListener('pagehide', event => { stop(); if (!event.persisted) life.abort(); }, options);
}

if (typeof document !== 'undefined') {
  const list = document.getElementById('discover-list');
  if (list) {
    list.replaceChildren(...DISCOVER.map(cardFor));
    document.addEventListener('album:playback', event => {
      for (const button of list.querySelectorAll('.discover__listen')) {
        const selected = event.detail.id === button.dataset.discoveryId;
        const playing = selected && event.detail.playing;
        button.setAttribute('aria-pressed', String(playing));
        button.textContent = playing ? 'pause ♫' : selected ? 'play ♫' : 'play in player ♫';
        button.disabled = event.detail.failed.includes(button.dataset.discoveryId);
      }
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) entry.target.classList.toggle('is-in-view', entry.isIntersecting && !document.hidden);
      });
      const cards = [...list.querySelectorAll('.discover__card')];
      cards.forEach(card => observer.observe(card));
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) cards.forEach(card => card.classList.remove('is-in-view'));
        else cards.forEach(card => { observer.unobserve(card); observer.observe(card); });
      });
      addEventListener('pagehide', () => observer.disconnect());
      addEventListener('pageshow', event => { if (event.persisted) cards.forEach(card => observer.observe(card)); });
    }
  }
  installSixSeven(document.getElementById('discover-six-seven'), document.getElementById('discover-meme'));
}
