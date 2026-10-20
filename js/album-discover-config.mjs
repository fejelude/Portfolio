// This is a separate collection; never add these slots to ALBUM.tracks.
// Fill the fields for each rank when the real content is supplied. All seven
// stay empty for now. description preserves blank lines. Artwork is a real
// image URL/path; link is the song's destination. audio may be a direct audio
// URL, opened as a song link when no other link is supplied. No audio is fetched
// or played by this template. Inline playback can be added with the recordings.
export const DISCOVER = Object.freeze([
  { rank: 1, title: '', artist: '', artwork: '', audio: '', link: '', description: '' },
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
