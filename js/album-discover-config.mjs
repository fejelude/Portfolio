// A separate ranking, never appended to ALBUM.tracks. Fill each rank only with
// supplied content. Descriptions preserve blank lines; links are optional.
// Configured audio uses the existing album player and its exclusive audio gate.
export const DISCOVER = Object.freeze([
  { rank: 1, title: 'Beauty And A Beat', artist: 'Justin Bieber ft. Nicki Minaj', artwork: '/assets/album/discover-01-cover.jpg', audio: '/assets/album/discover-01.mp3', fallbackAudio: '/assets/album/discover-01.m4a', duration: 64.27, link: '', description: `You already know why dis is my number one e, ALL I NEED IS A BEAUTY AND A BEATT WHO CAN MAKE MY LIFEE COMPLETEE OHHHHHH! 🫵

your that girl who could make my life complete so

yea

idk, this song just has that happy feeling i used to get whenever i knew id imagine you.` },
  { rank: 2, title: 'One Less Lonely Girl', artist: 'Justin Bieber', artwork: '/assets/album/discover-02-cover.jpg', audio: '/assets/album/discover-02.mp3', fallbackAudio: '/assets/album/discover-02.m4a', duration: 67.428345, link: '', description: `I SAW SO MANY PRETTY FACES BEFO I SAW YOU YOU NOW ALL I SEE IS YOUU

been to alot of places and aye, saw alot of pretty faces but idk sofhia franchesca just hits diff ig

i had crazy feelings back then its insane to look back at it diba?` },
  { rank: 3, title: 'Eenie Meenie', artist: 'Sean Kingston & Justin Bieber', artwork: '/assets/album/discover-03-cover.jpg', audio: '/assets/album/discover-03.mp3', fallbackAudio: '/assets/album/discover-03.m4a', duration: 36.313333, link: '', description: 'SOFI IS AN EENIE MEENIE MINEY MO LOVAA WOAHH OHHHH!' },
  { rank: 4, title: 'Perfect', artist: 'Ed Sheeran', artwork: '/assets/album/discover-04-cover.jpg', audio: '/assets/album/discover-04.mp3', fallbackAudio: '/assets/album/discover-04.m4a', duration: 54.75, link: '', description: 'One of the most beautiful songs ive ever played while imagining you, fr had me in tears back then' },
  { rank: 5, title: 'I Really Like You', artist: 'Carly Rae Jepsen', artwork: '/assets/album/discover-05-cover.jpg', audio: '/assets/album/discover-05.mp3', fallbackAudio: '/assets/album/discover-05.m4a', duration: 51.848345, link: '', description: 'YES I DO YES I DO ( Back then ) HUAHAHAHAHA' },
  { rank: 6, title: 'Paraluman', artist: 'Adie', artwork: '/assets/album/discover-06-cover.jpg', audio: '/assets/album/discover-06.mp3', fallbackAudio: '/assets/album/discover-06.m4a', duration: 88.768345, link: '', description: 'Makes me imagine how cute you are and how cute your eyes is, i used to love sofi without braces, so frigging cute when she smiles' },
  { rank: 7, title: 'Mundo', artist: 'IV of Spades', artwork: '/assets/album/discover-07-cover.jpg', audio: '/assets/album/discover-07.mp3', fallbackAudio: '/assets/album/discover-07.m4a', duration: 108.760816, link: '', description: `MUNDOY MAGIGING IKAWW


yes yes, no more JB songs muna HA, basta, MUNDOY MAGIGING IKAWW` },
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
    collectionTitle: 'MORE TO KNOWW',
  }));
}
