// A separate ranking, never appended to ALBUM.tracks. Fill each rank only with
// supplied content. Descriptions preserve blank lines; links are optional.
// Configured audio uses the existing album player and its exclusive audio gate.
export const DISCOVER = Object.freeze([
  { rank: 1, title: 'Beauty And A Beat', artist: 'Justin Bieber ft. Nicki Minaj', artwork: '/assets/album/discover-01-cover.jpg', audio: '/assets/album/discover-01.mp3', fallbackAudio: '/assets/album/discover-01.m4a', duration: 64.27, link: '', description: '' },
  { rank: 2, title: '', artist: '', artwork: '', audio: '', link: '', description: '' },
  { rank: 3, title: '', artist: '', artwork: '', audio: '', link: '', description: '' },
  { rank: 4, title: '', artist: '', artwork: '', audio: '', link: '', description: '' },
  { rank: 5, title: '', artist: '', artwork: '', audio: '', link: '', description: '' },
  { rank: 6, title: '', artist: '', artwork: '', audio: '', link: '', description: '' },
  { rank: 7, title: '', artist: '', artwork: '', audio: '', link: '', description: '' },
].map(slot => Object.freeze(slot)));

export function songDestination(value, base = 'https://fejelude.xyz') {
  if (!value || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function discoverTracks(slots = DISCOVER) {
  return slots.filter(slot => slot.audio).map(slot => ({
    id: `discover-${String(slot.rank).padStart(2, '0')}`,
    title: slot.title, artist: slot.artist, audio: slot.audio,
    fallbackAudio: slot.fallbackAudio, duration: slot.duration,
    cover: slot.artwork, mediaCover: slot.artwork, coverShape: 'square',
    note: slot.description, discoveryRank: slot.rank,
    collectionTitle: 'More to Discover ♡',
  }));
}
