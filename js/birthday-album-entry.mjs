import { ALBUM } from './album-config.mjs';

const link = document.getElementById('album-entry');
if (link) { link.textContent = ALBUM.entryButtonText; link.href = ALBUM.albumPath; }

// Follow the existing settled finale without changing its timeline or Replay.
const returnLink = document.getElementById('album-return');
const celebration = document.getElementById('celebration');
const replay = document.getElementById('replay');
if (returnLink && celebration && replay) {
  returnLink.textContent = ALBUM.returnButtonText;
  returnLink.href = ALBUM.albumPath;
  const sync = () => { returnLink.hidden = celebration.hidden || replay.hidden; };
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
