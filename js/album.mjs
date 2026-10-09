import { ALBUM } from './album-config.mjs';
import { AlbumPlayer } from './album-audio.mjs';
import { clamp, timeLabel } from './album-core.mjs';
import { GroveRenderer, ParticleGarden } from './birthday-art.mjs';

const $ = id => document.getElementById(id);
const life = new AbortController(), opts = { signal: life.signal };
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const grove = new GroveRenderer($('album-grove')), particles = new ParticleGarden($('album-particles'));
const rows = new Map(), probes = new Set(), metadataCache = new Map();
let player, disposed = false, opened = false, raf = 0, lastFrame = 0, lastGrove = 0, heartAt = 0, transitionTimer;
let pointer = { x: 0, y: 0 }, parallax = { x: 0, y: 0 }, tiltAttached = false;
let activeView = '', currentView = '', scrubbing = false, previousFocus = null;

// Recipient content is text, never interpolated HTML. Changing just the config
// updates both screens, the footer, birthday entry copy, and Media Session.
document.title = `${ALBUM.title} 💿`;
for (const id of ['cover-title', 'inside-title']) $(id).textContent = ALBUM.title;
$('cover-subtitle').textContent = ALBUM.subtitle;
$('opening-heading').textContent = ALBUM.openingHeading;
$('album-signature').textContent = ALBUM.signature;
$('album-note-title').textContent = ALBUM.noteTitle;
$('album-note-copy').replaceChildren(...ALBUM.note.map(text => {
  const paragraph = document.createElement('p'); paragraph.textContent = text; return paragraph;
}));
$('album-cover').src = ALBUM.frontCover || ALBUM.cover;
$('player-cover').src = ALBUM.cover;
$('closing-message').textContent = ALBUM.closingMessage;
$('closing-message').closest('.album__closing').hidden = !ALBUM.closingMessage;
$('birthday-back').href = ALBUM.birthdayPath;
$('track-count').textContent = `${String(ALBUM.tracks.length).padStart(2, '0')} tracks ♡`;
$('sample-label').hidden = !ALBUM.tracks.some(t => t.placeholder);
$('empty-album').hidden = ALBUM.tracks.length > 0;

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS(svg.namespaceURI, 'use');
  svg.setAttribute('aria-hidden', 'true'); use.setAttribute('href', `#icon-${name}`); svg.append(use); return svg;
}
function fallbackImage(img, src = ALBUM.cover) {
  img.addEventListener('error', () => {
    if (img.dataset.fallback) { img.style.visibility = 'hidden'; return; }
    img.dataset.fallback = 'true'; img.src = src;
  }, opts);
}
fallbackImage($('album-cover'), '/assets/album/cover.svg');
fallbackImage($('player-cover'), '/assets/album/cover.svg');

function noteFor(track, origin) {
  if (!track.note && !track.lyrics) return;
  previousFocus = origin || document.activeElement;
  $('note-title').textContent = track.title;
  $('note-number').textContent = `TRACK ${String(ALBUM.tracks.indexOf(track) + 1).padStart(2, '0')}`;
  $('note-copy').textContent = track.note || ''; $('note-copy').hidden = !track.note;
  $('note-lyrics').textContent = track.lyrics || ''; $('note-lyrics').hidden = !track.lyrics;
  $('note-dialog').showModal(); $('close-note').focus({ preventScroll: true });
}

for (const [index, track] of ALBUM.tracks.entries()) {
  const row = document.createElement('li'); row.className = 'album__track'; row.dataset.trackId = track.id; row.style.setProperty('--i', index);
  const button = document.createElement('button'); button.type = 'button'; button.className = 'album__track-button';
  const number = document.createElement('span'); number.className = 'album__track-number'; number.textContent = String(index + 1).padStart(2, '0');
  const art = document.createElement('span'); art.className = 'album__track-art'; art.setAttribute('aria-hidden', 'true');
  const img = document.createElement('img'); img.src = track.cover || ALBUM.cover; img.width = 40; img.height = 40;
  img.loading = 'lazy'; img.decoding = 'async'; img.alt = ''; fallbackImage(img); art.append(img);
  const info = document.createElement('span'); info.className = 'album__track-info';
  const title = document.createElement('span'); title.className = 'album__track-title'; title.textContent = track.title;
  const meta = document.createElement('span'); meta.className = 'album__track-meta';
  info.append(title, meta); button.append(number, art, info);
  const eq = document.createElement('span'); eq.className = 'album__equalizer'; eq.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) eq.append(document.createElement('i'));
  row.append(button, eq);
  if (track.note || track.lyrics) {
    row.classList.add('has-note'); const note = document.createElement('button'); note.type = 'button';
    note.className = 'album__track-note'; note.setAttribute('aria-label', `Read ${track.lyrics ? 'lyrics' : 'note'} for ${track.title}`);
    note.append(icon('heart')); note.addEventListener('click', () => noteFor(track, note), opts); row.append(note);
  }
  button.addEventListener('click', () => player.select(track.id), opts);
  rows.set(track.id, { row, button, meta, track }); $('tracklist').append(row);
}

function refreshRows(p) {
  for (const [id, { row, button, meta, track }] of rows) {
    const locked = !track.audio || p.failed.has(id), active = p.current?.id === id;
    row.classList.toggle('is-locked', locked); row.classList.toggle('is-active', active);
    button.disabled = locked; button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', `${track.title}${locked ? ' — Coming soon' : ` — ${timeLabel(p.metadata.get(id) ?? track.duration)}${track.placeholder ? ' — sample placeholder' : ''}`}`);
    meta.textContent = locked ? 'Coming soon 🔒' : `${timeLabel(p.metadata.get(id) ?? track.duration)}${track.placeholder ? ' · sample' : ''}`;
  }
}
function render(p) {
  document.body.classList.toggle('is-playing', p.state === 'playing');
  const key = `${p.current?.id}|${p.failed.size}|${[...p.metadata.values()].join()}`;
  if (key !== activeView) { activeView = key; refreshRows(p); }
  const track = p.current;
  if (track && track.id !== currentView) {
    currentView = track.id;
    $('player-title').textContent = track.title;
    $('player-number').textContent = `TRACK ${String(ALBUM.tracks.indexOf(track) + 1).padStart(2, '0')} / ${String(ALBUM.tracks.length).padStart(2, '0')}`;
    $('player-detail').textContent = track.placeholder ? 'a sample, waiting to become your song ♡' : `made with love by ${ALBUM.artist}`;
    $('player-cover').style.visibility = ''; delete $('player-cover').dataset.fallback;
    $('player-cover').src = track.cover || ALBUM.cover;
    $('player-note').hidden = !track.note && !track.lyrics;
    $('player-note').textContent = track.lyrics ? '♡ your little lyrics page' : '♡ a little note for you';
  }
  const loading = p.state === 'buffering' || p.state === 'loading';
  $('player-state').textContent = { idle: 'PICK A LITTLE SONG', loading: 'GETTING YOUR SONG', buffering: 'A LITTLE MOMENT…', playing: 'NOW PLAYING ♫', paused: 'SAVED YOUR PLACE ♡', finished: 'THANK YOU FOR LISTENING ♡' }[p.state];
  $('buffering').hidden = !loading; $('status-copy').textContent = p.message || (loading ? 'finding your song…' : '');
  $('tap-continue').hidden = !p.needsTap; $('play-again').hidden = p.state !== 'finished';
  $('play-pause').replaceChildren(icon(p.wantsPlaying ? 'pause' : 'play'));
  $('play-pause').setAttribute('aria-label', p.wantsPlaying ? 'Pause song' : track ? 'Play song' : 'Play first song');
  for (const id of ['play-pause', 'next', 'previous']) $(id).disabled = !p.queue.first(p.failed);
  $('shuffle').setAttribute('aria-pressed', String(p.queue.shuffle)); $('shuffle').setAttribute('aria-label', `Turn shuffle ${p.queue.shuffle ? 'off' : 'on'}`);
  $('repeat').setAttribute('aria-pressed', String(p.queue.repeat !== 'off'));
  $('repeat').setAttribute('aria-label', `Repeat ${p.queue.repeat}; next: repeat ${{ off: 'all', all: 'one', one: 'off' }[p.queue.repeat]}`);
  $('repeat-one').hidden = p.queue.repeat !== 'one';
  $('ambient-toggle').setAttribute('aria-pressed', String(p.mixer.muted));
  $('ambient-toggle').setAttribute('aria-label', `${p.mixer.muted ? 'Unmute' : 'Mute'} background music`);
  $('ambient-toggle').replaceChildren(icon(p.mixer.muted ? 'muted' : 'speaker'));
  const duration = track && (p.metadata.get(track.id) ?? track.duration), current = track ? p.audio.currentTime || 0 : 0;
  $('duration').textContent = timeLabel(duration); $('elapsed').textContent = timeLabel(current);
  const valid = track && p.matches() && Number.isFinite(p.audio.duration) && p.audio.duration > 0;
  $('song-seek').disabled = !valid;
  if (!scrubbing) {
    $('song-seek').max = valid ? p.audio.duration : duration || 100;
    $('song-seek').value = current; $('song-seek').style.setProperty('--progress', `${valid ? clamp(current / p.audio.duration) * 100 : 0}%`);
    $('song-seek').setAttribute('aria-valuetext', `${timeLabel(current)} of ${timeLabel(duration)}`);
  }
}
player = new AlbumPlayer($('song-audio'), $('next-audio'), ALBUM, render, () => {
  if (!motion.matches) {
    const rect = $('now-playing').getBoundingClientRect();
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      particles.emit(i % 3 === 0 ? 'heart' : 'confetti', rect.x + rect.width / 2, rect.y + 100,
        Math.cos(a) * 32, Math.sin(a) * 28 - 14, 1.3);
    }
  }
});
render(player);

// Read missing durations with metadata-only probes. Shared sample files are
// decoded once; no list audio can play, and only current/next preload in full.
async function readDurations() {
  for (const track of ALBUM.tracks) {
    if (disposed || !track.audio || Number.isFinite(track.duration)) continue;
    if (metadataCache.has(track.audio)) { player.metadata.set(track.id, metadataCache.get(track.audio)); render(player); continue; }
    const result = await new Promise(resolve => {
      const audio = new Audio(); let timer; probes.add(audio); audio.preload = 'metadata';
      const done = value => {
        clearTimeout(timer); audio.onloadedmetadata = null; audio.onerror = null;
        audio.removeAttribute('src'); audio.load(); probes.delete(audio); life.signal.removeEventListener('abort', abort); resolve(value);
      };
      const abort = () => done(null); life.signal.addEventListener('abort', abort, { once: true });
      audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : null);
      audio.onerror = () => done(null); timer = setTimeout(() => done(null), 6000);
      audio.src = audio.canPlayType('audio/mpeg') ? track.audio : track.fallbackAudio || track.audio;
    });
    if (disposed) return;
    if (result !== null) { metadataCache.set(track.audio, result); player.metadata.set(track.id, result); }
    render(player);
  }
}

function openAlbum() {
  if (opened || disposed) return;
  opened = true; player.open(); requestTilt(); $('ambient-toggle').disabled = false;
  $('open-album').disabled = true; $('cover-screen').classList.add('is-leaving');
  transitionTimer = setTimeout(() => {
    if (disposed) return;
    $('cover-screen').hidden = true; $('album-inside').hidden = false; document.body.classList.add('is-open');
    $('inside-title').focus({ preventScroll: true }); scrollTo({ top: 0, behavior: 'instant' }); resize(); readDurations();
  }, motion.matches ? 0 : 320);
}
function requestTilt() {
  if (motion.matches || tiltAttached) return;
  const attach = () => {
    if (disposed || tiltAttached || motion.matches) return;
    tiltAttached = true;
    addEventListener('deviceorientation', event => {
      if (motion.matches || event.gamma == null || event.beta == null) return;
      pointer = { x: clamp(event.gamma / 25, -1, 1), y: clamp((event.beta - 45) / 30, -1, 1) };
    }, opts);
  };
  try {
    if (typeof window.DeviceOrientationEvent?.requestPermission === 'function') window.DeviceOrientationEvent.requestPermission().then(value => { if (value === 'granted') attach(); }).catch(() => {});
    else if ('DeviceOrientationEvent' in window) attach();
  } catch { /* Mouse parallax is always available. */ }
}
function resize() { if (disposed) return; if (grove.c) grove.resize(innerWidth, innerHeight); particles.resize(innerWidth, innerHeight); }
function schedule() { if (!raf && !disposed && !document.hidden) raf = requestAnimationFrame(frame); }
function frame(now) {
  raf = 0; if (disposed || document.hidden) return;
  const ms = lastFrame ? now - lastFrame : 16, dt = clamp(ms / 1000, 0, 0.06); lastFrame = now;
  const t = now / 1000;
  if (motion.matches) { parallax.x = 0; parallax.y = 0; }
  else { const blend = 1 - Math.exp(-Math.min(ms, 60) / 190); parallax.x += (pointer.x - parallax.x) * blend; parallax.y += (pointer.y - parallax.y) * blend; }
  if (now - lastGrove > (motion.matches ? 120 : 32)) { grove.render(t, motion.matches, parallax); lastGrove = now; }
  if (!motion.matches && now > heartAt) { heartAt = now + 2700 / particles.quality; particles.emit('heart', innerWidth * (.1 + Math.random() * .8), innerHeight + 5, 3, -15, innerHeight / 15 + 2); }
  particles.render(dt, t, motion.matches, true, false, ms);
  if (opened) $('record-glow').style.opacity = String(motion.matches ? .35 : .28 + player.mixer.energy() * .72);
  else if (!motion.matches) $('album-sleeve').style.transform = `rotate(-3deg) translate(${parallax.x * 3}px,${parallax.y * 2}px)`;
  schedule();
}

$('open-album').addEventListener('click', openAlbum, opts);
$('play-pause').addEventListener('click', () => player.toggle(), opts);
$('previous').addEventListener('click', () => player.previous(), opts);
$('next').addEventListener('click', () => player.next(), opts);
$('shuffle').addEventListener('click', () => player.setShuffle(!player.queue.shuffle), opts);
$('repeat').addEventListener('click', () => player.cycleRepeat(), opts);
$('ambient-toggle').addEventListener('click', () => player.setMuted(!player.mixer.muted), opts);
$('tap-continue').addEventListener('click', () => player.continue(), opts);
$('play-again').addEventListener('click', () => player.restart(), opts);
$('player-note').addEventListener('click', () => { if (player.current) noteFor(player.current, $('player-note')); }, opts);
for (const id of ['close-note', 'note-ok']) $(id).addEventListener('click', () => $('note-dialog').close(), opts);
$('note-dialog').addEventListener('close', () => { previousFocus?.focus({ preventScroll: true }); }, opts);
$('note-dialog').addEventListener('click', event => {
  const rect = $('note-dialog').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('note-dialog').close();
}, opts);
$('song-seek').addEventListener('input', event => {
  scrubbing = true; const value = Number(event.target.value);
  $('elapsed').textContent = timeLabel(value); event.target.style.setProperty('--progress', `${clamp(value / Number(event.target.max)) * 100}%`);
  event.target.setAttribute('aria-valuetext', `${timeLabel(value)} of ${timeLabel(Number(event.target.max))}`);
}, opts);
$('song-seek').addEventListener('change', event => { player.seek(Number(event.target.value)); scrubbing = false; render(player); }, opts);
for (const event of ['blur', 'pointercancel']) $('song-seek').addEventListener(event, () => { scrubbing = false; render(player); }, opts);
addEventListener('pointermove', event => {
  if (!motion.matches && event.pointerType !== 'touch') pointer = { x: clamp(event.clientX / innerWidth * 2 - 1, -1, 1), y: clamp(event.clientY / innerHeight * 2 - 1, -1, 1) };
}, { ...opts, passive: true });
addEventListener('resize', resize, opts);
motion.addEventListener('change', () => { pointer = { x: 0, y: 0 }; parallax = { x: 0, y: 0 }; }, opts);
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('is-hidden', document.hidden); player.setHidden(document.hidden);
  if (document.hidden) { cancelAnimationFrame(raf); raf = 0; lastFrame = 0; } else schedule();
}, opts);
addEventListener('offline', () => { if (player.wantsPlaying && player.state !== 'playing') player.pause(false); }, opts);
function dispose() {
  if (disposed) return;
  disposed = true; clearTimeout(transitionTimer); cancelAnimationFrame(raf); raf = 0;
  life.abort(); player.dispose(); particles.reset(); probes.clear();
}
addEventListener('pagehide', event => {
  if (event.persisted) { player.pause(false); player.setHidden(true); cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
  else dispose();
}, opts);
addEventListener('pageshow', event => { if (event.persisted) { player.setHidden(document.hidden); resize(); schedule(); } }, opts);
$('birthday-back').addEventListener('click', () => player.pause(), opts);
$('open-album').disabled = false; $('cover-hint').textContent = ALBUM.openingHint;
resize(); schedule();
