import { ALBUM } from './album-config.mjs';

// The welcome link is available immediately, independently of birthday loading.
// Its parent already handles leaving the welcome screen; no timeline observers.
const link = document.getElementById('album-entry');
if (link) link.textContent = ALBUM.entryButtonText;
