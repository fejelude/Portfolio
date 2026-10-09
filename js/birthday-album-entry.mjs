import { ALBUM } from './album-config.mjs';

const link = document.getElementById('album-entry');
const celebration = document.getElementById('celebration');
const replay = document.getElementById('replay');
// Observe the existing settled-finale signal; never modify its clock, audio,
// animations, Replay handler, or DOM state.
if (link && celebration && replay) {
  link.textContent = ALBUM.entryButtonText;
  const sync = () => { link.hidden = celebration.hidden || replay.hidden; };
  const observer = new MutationObserver(sync);
  const connect = () => {
    observer.observe(celebration, { attributes: true, attributeFilter: ['hidden'] });
    observer.observe(replay, { attributes: true, attributeFilter: ['hidden'] });
    sync();
  };
  connect();
  addEventListener('pagehide', () => observer.disconnect());
  addEventListener('pageshow', event => { if (event.persisted) connect(); });
}
