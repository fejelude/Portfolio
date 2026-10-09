// Everything you give Sofhia lives here. Keep IDs unique and stable; order is
// exactly the order below. Set audio: '' for an unfinished / locked song.
export const ALBUM = {
  title: "Sofhia's Songs",
  subtitle: 'made with love, for your 16th birthdayy',
  artist: 'Feje',
  closingMessage: 'Happy 16th Birthday, Sofhia 💖 — made with love',
  entryButtonText: '🎵 I made you an album — tap to open',
  birthdayPath: '/sofhia-franchesca-16',
  cover: '/assets/album/cover.svg',
  frontCover: '/assets/album/sofhia-birthday-disc.jpg',
  mediaCover: '/assets/album/cover.png',
  backgroundMusic: '/assets/album/background.mp3',
  backgroundVolume: 0.4,
  loopCrossfade: 0.5,
  // A short original sample primes the same HTML audio element on OPEN ITT.
  // Do not replace this with a real song: priming is inaudible.
  unlockAudio: '/assets/album/sample.mp3',
  tracks: [
    { id: 'song-01', title: 'Placeholder 01', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/heart.svg', duration: 8, placeholder: true, note: 'A little space for the first song. Replace this sample note with something just for Sofhia. ♡' },
    { id: 'song-02', title: 'Placeholder 02', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/star.svg', duration: 8, placeholder: true },
    { id: 'song-03', title: 'Placeholder 03', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/blossom.svg', placeholder: true },
    { id: 'song-04', title: 'Placeholder 04', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/star.svg', duration: 8, placeholder: true },
    { id: 'song-05', title: 'Placeholder 05', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/blossom.svg', duration: 8, placeholder: true, note: 'Your dedication goes here. Little messages are optional — the heart only appears when there is one.' },
    { id: 'song-06', title: 'Placeholder 06', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/heart.svg', duration: 8, placeholder: true },
    { id: 'song-07', title: 'Placeholder 07', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/blossom.svg', placeholder: true },
    { id: 'song-08', title: 'Placeholder 08', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/heart.svg', duration: 8, placeholder: true },
    { id: 'song-09', title: 'Placeholder 09', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/star.svg', duration: 8, placeholder: true },
    { id: 'song-10', title: 'Placeholder 10', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/heart.svg', duration: 8, placeholder: true, lyrics: 'Replace these sample lines with your lyrics.\n\nEvery song gets its own little page,\nand this one is waiting for yours. ♡' },
    { id: 'song-11', title: 'Placeholder 11', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/star.svg', duration: 8, placeholder: true },
    { id: 'song-12', title: 'Placeholder 12', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/blossom.svg', duration: 8, placeholder: true },
    { id: 'song-13', title: 'Placeholder 13', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/star.svg', placeholder: true },
    { id: 'song-14', title: 'Placeholder 14', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/blossom.svg', duration: 8, placeholder: true },
    { id: 'song-15', title: 'Placeholder 15', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/heart.svg', duration: 8, placeholder: true },
    { id: 'song-16', title: 'Placeholder 16', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/blossom.svg', duration: 8, placeholder: true },
    { id: 'song-17', title: 'Placeholder 17', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/heart.svg', duration: 8, placeholder: true },
    { id: 'song-18', title: 'Placeholder 18', audio: '/assets/album/sample.mp3', fallbackAudio: '/assets/album/sample.m4a', cover: '/assets/album/star.svg', duration: 8, placeholder: true, note: 'The last little space in the album. Put your closing dedication here, or remove this note to hide the heart.' },
  ],
};
