import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { AlbumPlayer } from '../js/album-audio.mjs';

// Exercise the actual controller with deterministic platform doubles. Browser
// smoke tests separately use native decoding/audio, never this fake platform.
class Param {
  constructor(value = 0) { this.value = value; }
  cancelScheduledValues() {}
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
}
class Node {
  constructor() { this.gain = new Param(); }
  connect() {} disconnect() {}
}
class Context extends EventTarget {
  constructor() { super(); this.state = 'suspended'; this.anchor = performance.now(); this.destination = new Node(); }
  get currentTime() { return (performance.now() - this.anchor) / 1000; }
  createGain() { return new Node(); }
  createMediaElementSource() { return new Node(); }
  createAnalyser() { return Object.assign(new Node(), { fftSize: 256, getByteTimeDomainData: samples => samples.fill(128) }); }
  resume() { this.state = 'running'; this.dispatchEvent(new Event('statechange')); return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
class Media extends EventTarget {
  constructor() { super(); this.attrs = new Map(); this.paused = true; this.ended = false; this.readyState = 4; this.duration = 8; this.volume = 1; this.position = 0; this.playCount = 0; this.denied = false; this.bad = false; this.pending = false; }
  get currentTime() { return this.position; }
  set currentTime(value) { this.position = value; this.ended = false; if (this.pauseOnSeek && !this.paused) this.pause(); queueMicrotask(() => this.dispatchEvent(new Event('seeked'))); }
  get src() { return this.attrs.get('src') || ''; }
  set src(value) { this.attrs.set('src', value); this.currentSrc = new URL(value, document.baseURI).href; this.position = 0; this.ended = false; this.paused = true; }
  getAttribute(key) { return this.attrs.get(key) ?? null; }
  removeAttribute(key) { this.attrs.delete(key); if (key === 'src') this.currentSrc = ''; }
  canPlayType() { return 'probably'; }
  load() {}
  play() {
    this.playCount++;
    if (this.denied) return Promise.reject(new DOMException('blocked','NotAllowedError'));
    if (this.bad) return Promise.reject(new DOMException('missing','NotSupportedError'));
    if (this.pending) return new Promise(() => {});
    this.paused = false; this.ended = false;
    return Promise.resolve().then(() => this.dispatchEvent(new Event('playing')));
  }
  pause() { const was = this.paused; this.paused = true; if (!was) queueMicrotask(() => this.dispatchEvent(new Event('pause'))); }
  end() { this.position = this.duration; this.ended = true; this.paused = true; this.dispatchEvent(new Event('ended')); }
}

const mediaSession = { handlers: new Map(), setActionHandler(action, handler) { this.handlers.set(action, handler); }, setPositionState(value) { this.position = value; } };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaSession, onLine: true } });
globalThis.window = { AudioContext: Context, MediaMetadata: class { constructor(data) { Object.assign(this,data); } } };
globalThis.MediaMetadata = window.MediaMetadata;
globalThis.document = { baseURI: 'https://album.test/' };

function fixture() {
  const audio = new Media(), next = new Media(); let bursts = 0;
  const config = { title: 'Test album', artist: 'Feje', backgroundMusic: '', backgroundVolume: .4, unlockAudio: '/sample.mp3',
    tracks: [{ id: 'a', title: 'A', audio: '/a.mp3' },{ id: 'locked', title: 'Locked', audio: '' },{ id: 'b', title: 'B', audio: '/b.mp3', fallbackAudio: '/b.m4a' },{ id: 'c', title: 'C', audio: '/c.mp3' }] };
  const p = new AlbumPlayer(audio, next, config, () => {
    assert.ok(!(p.mixer.songAudible && p.mixer.ambientValue() > .001), 'audible song and background must never overlap');
  }, () => bursts++);
  return { p, audio, next, bursts: () => bursts };
}
async function settled(p) { for (let i = 0; i < 200; i++) { if (!p.transitioning && !['loading'].includes(p.state)) return; await delay(5); } throw Error('controller did not settle'); }

test('OPEN primes the same element silently in the gesture and leaves browsing ambience eligible', async () => {
  const { p, audio } = fixture(); p.open();
  assert.equal(audio.playCount,1); assert.equal(p.mixer.songAudible,false); assert.equal(p.current,null);
  await delay(5); assert.equal(audio.paused,true); assert.equal(p.mixer.songWanted,false); p.dispose();
});
test('song and background gates remain exclusive through the 600ms duck and pause', async () => {
  const { p } = fixture(); p.open(); await delay(5);
  await p.mixer.fadeAmbient(.4,0); p.select('a');
  assert.equal(p.mixer.songAudible,false); assert.equal(p.mixer.envelope.to,0);
  await settled(p); assert.equal(p.state,'playing'); assert.equal(p.mixer.ambientValue(),0); assert.equal(p.mixer.songAudible,true);
  p.pause(); assert.equal(p.mixer.songAudible,false); assert.equal(p.mixer.envelope.to,.4); p.dispose();
});
test('rapid track changes and pauses cancel obsolete play completions', async () => {
  const { p, audio } = fixture(); p.open(); await delay(5); await p.mixer.fadeAmbient(.4,0);
  p.select('a'); p.select('b'); audio.end();
  assert.equal(p.current.id,'b','an obsolete ended event during the silent transition cannot advance the new selection');
  p.select('c'); p.pause(); await delay(650);
  assert.equal(p.current.id,'c'); assert.equal(p.state,'paused'); assert.equal(audio.paused,true); assert.equal(p.mixer.songAudible,false);
  p.play(); await settled(p); assert.equal(p.current.id,'c'); assert.equal(p.state,'playing'); p.dispose();
});
test('stale play rejection cannot interrupt a newer successful track', async () => {
  const { p, audio } = fixture(); p.open(); await delay(5);
  audio.denied = true; p.select('a'); audio.denied = false; p.select('c'); await settled(p);
  assert.equal(p.current.id,'c'); assert.equal(p.needsTap,false); assert.equal(p.state,'playing'); p.dispose();
});
test('a WebKit pause during the quiet rewind resumes before the song gate opens', async () => {
  const { p, audio } = fixture(); p.open(); await delay(5); audio.pauseOnSeek = true;
  p.select('a'); audio.position = .5; const calls = audio.playCount; await settled(p);
  assert.equal(audio.playCount,calls+1); assert.equal(audio.currentTime,0);
  assert.equal(audio.paused,false); assert.equal(p.state,'playing'); assert.equal(p.needsTap,false);
  audio.pause(); await delay(5); assert.equal(p.needsTap,true,'a later external pause still requires a tap'); p.dispose();
});
test('blocked play provides Tap to continue and keeps the selected position', async () => {
  const { p, audio } = fixture(); p.open(); await delay(5); audio.denied = true; p.select('a'); await settled(p);
  assert.equal(p.needsTap,true); assert.equal(p.state,'paused'); assert.equal(p.mixer.songAudible,false);
  audio.currentTime = 3.5; audio.denied = false; p.continue(); await settled(p);
  assert.equal(p.needsTap,false); assert.equal(p.current.id,'a'); assert.equal(audio.currentTime,3.5); p.dispose();
});
test('external pauses and interrupted contexts require a tap; hidden pauses cannot restart ambience', async () => {
  const { p, audio } = fixture(); p.open(); await delay(5); p.select('a'); await settled(p);
  p.setHidden(true); audio.pause(); await delay(5); assert.equal(p.needsTap,true); assert.equal(p.mixer.envelope.to,0);
  p.setHidden(false); p.continue(); await settled(p);
  p.mixer.context.state = 'interrupted'; p.mixer.context.dispatchEvent(new Event('statechange'));
  assert.equal(p.needsTap,true); assert.equal(audio.paused,true);
  p.setHidden(true); p.setHidden(false); p.mixer.context.dispatchEvent(new Event('statechange'));
  assert.equal(p.resumeTarget,'song'); p.continue(); await settled(p);
  assert.equal(p.state,'playing'); assert.equal(p.current.id,'a'); p.dispose();
});
test('background mute never opens its gate over a song', async () => {
  const { p } = fixture(); p.open(); await delay(5); p.select('a'); await settled(p);
  p.setMuted(true); p.setMuted(false); assert.equal(p.mixer.envelope.to,0); assert.equal(p.mixer.songAudible,true);
  p.pause(); p.setMuted(true); assert.equal(p.mixer.envelope.to,0); p.dispose();
});
test('returning to interrupted background music offers a tap and preserves a manually paused song', async () => {
  const { p, audio } = fixture(); p.open(); await delay(5);
  p.setHidden(true); p.mixer.context.state = 'interrupted'; p.setHidden(false);
  assert.equal(p.needsTap,true); assert.equal(p.resumeTarget,'ambient'); p.continue(); await delay(5);
  assert.equal(p.needsTap,false); assert.equal(audio.paused,true);
  p.select('a'); await settled(p); p.pause(); const calls = audio.playCount;
  p.mixer.context.state = 'suspended'; p.mixer.context.dispatchEvent(new Event('statechange'));
  assert.equal(p.resumeTarget,'ambient'); p.continue(); await delay(5);
  assert.equal(audio.playCount,calls); assert.equal(p.wantsPlaying,false); assert.equal(p.needsTap,false); p.dispose();
});
test('ended advances, skips locked songs, and cleanly finishes with restart available', async () => {
  const { p, audio } = fixture(); p.open(); await delay(5); p.select('a'); await settled(p);
  audio.end(); await settled(p); assert.equal(p.current.id,'b');
  audio.end(); await settled(p); assert.equal(p.current.id,'c');
  audio.end(); assert.equal(p.state,'finished'); assert.equal(p.wantsPlaying,false); assert.equal(p.mixer.songAudible,false);
  p.restart(); await settled(p); assert.equal(p.current.id,'a'); p.dispose();
});
test('missing files try AAC once, then skip gracefully without an unhandled rejection', async () => {
  const { p, audio } = fixture(); p.open(); await delay(5); p.select('b'); await settled(p);
  audio.bad = true; audio.dispatchEvent(new Event('error'));
  assert.equal(p.usedFallback,true); assert.equal(audio.src,'/b.m4a');
  await delay(5); assert.equal(p.current.id,'c'); assert.ok(p.failed.has('b'));
  audio.bad = false; p.select('a'); await settled(p); assert.equal(p.state,'playing'); p.dispose();
});
test('buffering preserves the single song, resumes correctly, and next preload never plays', async () => {
  const { p, audio, next } = fixture(); p.open(); await delay(5); audio.readyState = 2; p.select('a'); await settled(p);
  assert.equal(p.state,'playing','resolved native playback is playing even with WebKit HAVE_CURRENT_DATA');
  assert.equal(next.src,'/b.mp3'); assert.equal(next.preload,'auto'); assert.equal(next.playCount,0);
  audio.dispatchEvent(new Event('waiting')); assert.equal(p.state,'buffering'); assert.equal(p.mixer.envelope.to,0);
  audio.currentTime += .25; audio.dispatchEvent(new Event('timeupdate'));
  assert.equal(p.state,'playing','native clock progress recovers buffering when WebKit omits playing');
  audio.dispatchEvent(new Event('waiting')); assert.equal(p.state,'buffering');
  audio.dispatchEvent(new Event('playing')); assert.equal(p.state,'playing'); p.dispose();
});
test('a late failed file after a manual pause cannot restart song playback', async () => {
  const { p, audio } = fixture(); p.open(); await delay(5); p.select('a'); await settled(p); p.pause();
  audio.dispatchEvent(new Event('error')); await delay(5);
  assert.equal(p.current.id,'b'); assert.equal(p.state,'paused'); assert.equal(p.wantsPlaying,false);
  assert.equal(p.mixer.songAudible,false); assert.equal(audio.paused,true); p.dispose();
});
test('Media Session play/pause/seek/next work and exit releases handlers, sources and timers', async () => {
  const { p, audio, next } = fixture(); p.open(); await delay(5); p.select('a'); await settled(p);
  assert.equal(mediaSession.metadata.title,'A'); mediaSession.handlers.get('seekto')({ seekTime: 2 }); assert.equal(audio.currentTime,2);
  mediaSession.handlers.get('pause')(); assert.equal(p.state,'paused'); mediaSession.handlers.get('play')(); await settled(p);
  mediaSession.handlers.get('nexttrack')(); await settled(p); assert.equal(p.current.id,'b');
  p.dispose(); assert.equal(audio.src,''); assert.equal(next.src,''); assert.equal(p.life.signal.aborted,true); assert.equal(p.mixer.context,null);
  assert.equal(mediaSession.handlers.get('play'),null); assert.equal(mediaSession.metadata,null);
  audio.dispatchEvent(new Event('playing')); audio.dispatchEvent(new Event('ended')); assert.equal(p.disposed,true);
});
