import { clamp, crossfadeChannel, TrackQueue } from './album-core.mjs';

// One decoded, sample-accurate loop and one reusable HTMLAudioElement. The two
// gain gates are mutually exclusive: a song is only opened after ambient=0.
export class AlbumMixer {
  constructor(audio, config, onInterruption, onAmbientError) {
    this.audio = audio; this.config = config; this.onInterruption = onInterruption;
    this.onAmbientError = onAmbientError; this.life = new AbortController();
    this.context = null; this.opened = false; this.hidden = false; this.muted = false;
    this.songAudible = false; this.songWanted = false; this.disposed = false;
    this.envelope = { from: 0, to: 0, start: 0, duration: 0 };
    this.prepare = config.backgroundMusic ? fetch(config.backgroundMusic, { signal: this.life.signal })
      .then(response => { if (!response.ok) throw new Error('ambient'); return response.arrayBuffer(); })
      .catch(() => null) : Promise.resolve(null);
  }
  wake() {
    if (this.disposed) return;
    try {
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) { this.onAmbientError(); return; }
        this.context = new Context();
        this.ambientGain = this.context.createGain(); this.ambientGain.gain.value = 0;
        this.ambientGain.connect(this.context.destination);
        this.songGain = this.context.createGain(); this.songGain.gain.value = 0;
        this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 256;
        this.samples = new Uint8Array(this.analyser.fftSize);
        this.songSource = this.context.createMediaElementSource(this.audio);
        this.songSource.connect(this.songGain); this.songGain.connect(this.analyser); this.analyser.connect(this.context.destination);
        this.context.addEventListener('statechange', () => {
          if (this.context.state !== 'running' && this.context.state !== 'closed') this.onInterruption();
        }, { signal: this.life.signal });
        this.loadAmbient();
      }
      // Always invoke resume synchronously inside the user's tap, never after
      // decoding, fading, a screen transition, or a permission prompt.
      const promise = this.context.resume();
      Promise.resolve(promise).then(() => this.onWake?.()).catch(() => this.onInterruption());
    } catch {
      // Keep native songs usable if the browser cannot create the audio graph.
      const closed = this.context?.close(); closed?.catch(() => {});
      this.context = null; this.songGain = null; this.analyser = null;
      this.audio.volume = this.songAudible ? 1 : 0; this.onAmbientError();
    }
  }
  async loadAmbient() {
    try {
      const data = await this.prepare;
      if (this.disposed) return;
      if (!data) { if (this.config.backgroundMusic) this.onAmbientError(); return; }
      const decoded = await this.context.decodeAudioData(data);
      if (this.disposed) return;
      const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) =>
        crossfadeChannel(decoded.getChannelData(i), decoded.sampleRate * clamp(this.config.loopCrossfade ?? 0.5, 0.05, 2)));
      const loop = this.context.createBuffer(channels.length, channels[0].length, decoded.sampleRate);
      channels.forEach((channel, i) => loop.copyToChannel(channel, i));
      this.loop = this.context.createBufferSource(); this.loop.buffer = loop; this.loop.loop = true;
      this.loop.connect(this.ambientGain); this.loop.start(); this.restoreAmbient();
    } catch { if (!this.disposed) this.onAmbientError(); }
  }
  ambientValue() {
    if (!this.context) return 0;
    const e = this.envelope;
    return e.from + (e.to - e.from) * clamp(e.duration ? (this.context.currentTime - e.start) / e.duration : 1);
  }
  fadeAmbient(value, seconds = 0.6) {
    clearTimeout(this.fadeTimer); this.fadeResolve?.(); this.fadeResolve = null;
    if (!this.context || this.disposed) return Promise.resolve();
    const now = this.context.currentTime, from = this.ambientValue(), param = this.ambientGain.gain;
    param.cancelScheduledValues(now); param.setValueAtTime(from, now);
    const duration = Math.abs(value - from) < 0.001 ? 0 : seconds;
    if (duration) param.linearRampToValueAtTime(value, now + duration); else param.setValueAtTime(value, now);
    this.envelope = { from, to: value, start: now, duration };
    if (!duration) return Promise.resolve();
    return new Promise(resolve => { this.fadeResolve = resolve; this.fadeTimer = setTimeout(() => { this.fadeResolve = null; resolve(); }, duration * 1000); });
  }
  silenceSong() {
    this.songAudible = false;
    if (this.songGain) { const now = this.context.currentTime; this.songGain.gain.cancelScheduledValues(now); this.songGain.gain.setValueAtTime(0, now); }
    else this.audio.volume = 0;
  }
  startSong() {
    if (this.disposed) return;
    // A suspended context may not have advanced through the fade yet. Force
    // the ambient gate shut at the exact same audio time before opening this.
    this.fadeAmbient(0, 0); this.songAudible = true;
    if (this.songGain) this.songGain.gain.setValueAtTime(1, this.context.currentTime);
    else this.audio.volume = 1;
  }
  restoreAmbient() {
    const allowed = this.opened && !this.hidden && !this.songWanted && !this.songAudible && !this.muted;
    return this.fadeAmbient(allowed ? clamp(this.config.backgroundVolume ?? 0.4) : 0);
  }
  energy() {
    if (!this.analyser || !this.songAudible || this.context.state !== 'running') return 0;
    this.analyser.getByteTimeDomainData(this.samples);
    let sum = 0;
    for (const n of this.samples) sum += ((n - 128) / 128) ** 2;
    return clamp(Math.sqrt(sum / this.samples.length) * 5);
  }
  dispose() {
    this.disposed = true; this.life.abort(); clearTimeout(this.fadeTimer); this.fadeResolve?.();
    this.silenceSong();
    try { this.loop?.stop(); this.loop?.disconnect(); this.songSource?.disconnect(); this.songGain?.disconnect(); this.analyser?.disconnect(); this.ambientGain?.disconnect(); } catch { /* Nodes may already be stopped. */ }
    const result = this.context?.close(); result?.catch(() => {});
    this.loop = null; this.context = null;
  }
}

export class AlbumPlayer {
  constructor(audio, nextAudio, config, update, burst) {
    this.audio = audio; this.nextAudio = nextAudio; this.config = config;
    this.update = update; this.burst = burst; this.queue = new TrackQueue(config.tracks);
    this.failed = new Set(); this.life = new AbortController(); this.attempt = null;
    this.current = null; this.state = 'idle'; this.wantsPlaying = false; this.generation = 0;
    this.message = ''; this.needsTap = false; this.resumeTarget = ''; this.opened = false; this.disposed = false;
    this.transitioning = false; this.usedFallback = false; this.metadata = new Map();
    this.mixer = new AlbumMixer(audio, config, () => this.interrupt(), () => {
      if (!this.current && this.opened) { this.message = 'the background music is taking a little break ♡'; this.emit(); }
    });
    this.mixer.onWake = () => { if (!this.disposed && this.needsTap && this.resumeTarget === 'ambient') { this.needsTap = false; this.resumeTarget = ''; this.message = ''; this.mixer.restoreAmbient(); this.emit(); } };
    const opts = { signal: this.life.signal };
    audio.addEventListener('loadedmetadata', () => {
      if (!this.matches()) return;
      if (Number.isFinite(audio.duration)) this.metadata.set(this.current.id, audio.duration);
      this.emit(); this.positionState();
    }, opts);
    audio.addEventListener('timeupdate', () => { this.emit(); this.positionState(); }, opts);
    audio.addEventListener('durationchange', () => { if (this.matches() && Number.isFinite(audio.duration)) this.metadata.set(this.current.id, audio.duration); this.emit(); }, opts);
    audio.addEventListener('waiting', () => {
      if (this.matches() && this.wantsPlaying) { this.state = 'buffering'; this.message = 'hold on, finding your song…'; this.armWatchdog(); this.emit(); }
    }, opts);
    audio.addEventListener('stalled', () => {
      if (this.matches() && this.wantsPlaying && audio.readyState < 3) { this.state = 'buffering'; this.armWatchdog(); this.emit(); }
    }, opts);
    audio.addEventListener('playing', () => {
      if (!this.matches() || !this.wantsPlaying || this.disposed) return;
      clearTimeout(this.watchdog);
      if (!this.transitioning) { this.mixer.startSong(); this.state = 'playing'; this.message = ''; this.needsTap = false; this.emit(); }
    }, opts);
    audio.addEventListener('pause', () => {
      if (this.disposed || this.transitioning || !this.current || audio.ended || !audio.paused || !this.wantsPlaying) return;
      // External interruption (call, headset, browser): do not fight a pause
      // with an automatic play loop, and do not restart ambience when hidden.
      this.interrupt();
    }, opts);
    audio.addEventListener('ended', () => {
      if (!this.matches() || !audio.ended || !this.wantsPlaying || this.disposed) return;
      clearTimeout(this.watchdog); this.mixer.silenceSong();
      const next = this.queue.next(this.current.id, this.failed, true);
      if (next) this.select(next); else this.finish();
    }, opts);
    audio.addEventListener('error', () => { if (this.matches() && this.opened) this.fileFailed(); }, opts);
    this.installMediaSession();
    audio.preload = 'metadata'; audio.src = config.unlockAudio;
  }
  matches() { return this.current && this.audio.currentSrc === new URL(this.sourcePath, document.baseURI).href; }
  emit() { if (!this.disposed) { this.update(this); this.mediaPlaybackState(); } }
  cancelAttempt() { this.generation++; this.attempt?.abort(); this.attempt = null; clearTimeout(this.watchdog); this.transitioning = false; }
  open() {
    if (this.opened || this.disposed) return;
    this.opened = true; this.mixer.opened = true; this.mixer.wake(); this.mixer.silenceSong();
    this.audio.preload = 'auto';
    // Prime this exact media element in the OPEN ITT tap (like birthday START).
    // The gain gate is 0, so there is never an audible sample on the cover tap.
    const token = this.generation;
    try {
      const promise = this.audio.play();
      Promise.resolve(promise).then(() => { if (!this.disposed && token === this.generation && !this.wantsPlaying) this.audio.pause(); })
        .catch(() => { /* A track tap retries on the same element. */ });
    } catch { /* The track controls still provide an explicit gesture. */ }
    this.mixer.restoreAmbient(); this.emit();
  }
  sourceFor(track) {
    if (!this.audio.canPlayType('audio/mpeg') && track.fallbackAudio && this.audio.canPlayType('audio/mp4')) {
      this.usedFallback = true; return track.fallbackAudio;
    }
    return track.audio;
  }
  select(id, { autoplay = true } = {}) {
    if (this.disposed) return;
    const track = this.config.tracks.find(t => t.id === id);
    if (!track || !this.queue.playable(id, this.failed)) return;
    this.cancelAttempt(); this.wantsPlaying = false; this.mixer.songWanted = autoplay;
    this.mixer.silenceSong(); this.audio.pause(); this.current = track;
    this.queue.remember(id); this.usedFallback = false;
    this.sourcePath = this.sourceFor(track);
    this.audio.preload = 'auto';
    if (this.audio.getAttribute('src') !== this.sourcePath) this.audio.src = this.sourcePath;
    try { this.audio.currentTime = 0; } catch { /* Cold metadata arrives next. */ }
    this.state = 'loading'; this.needsTap = false; this.message = '';
    this.mediaMetadata(); this.preloadNext(); this.emit();
    if (autoplay) this.play(); else this.pause();
  }
  play() {
    if (!this.current) { const first = this.queue.first(this.failed); if (first) this.select(first); return; }
    if (this.disposed || !this.queue.playable(this.current.id, this.failed)) return;
    this.cancelAttempt(); const token = this.generation;
    this.attempt = new AbortController(); const signal = this.attempt.signal;
    this.wantsPlaying = true; this.mixer.songWanted = true; this.needsTap = false; this.resumeTarget = '';
    this.transitioning = true; this.state = 'loading'; this.message = '';
    const position = this.audio.ended ? 0 : this.audio.currentTime || 0;
    this.mixer.wake(); this.mixer.silenceSong();
    const quiet = this.mixer.fadeAmbient(0);
    this.armWatchdog(); this.emit();
    let played;
    // play() is called now, while the tap is active. For the fade's duration,
    // the song is silent. Rewind that inaudible time before opening its gate.
    try { played = this.audio.play(); } catch (error) { this.playRejected(error, token); return; }
    Promise.all([Promise.resolve(played), quiet]).then(async () => {
      if (token !== this.generation || this.disposed || !this.wantsPlaying) return;
      if (this.audio.currentTime > position + 0.04) await this.seekQuietly(position, signal);
      if (token !== this.generation || this.disposed || !this.wantsPlaying) return;
      if (this.audio.paused) { this.interrupt(); return; }
      if (this.mixer.context && this.mixer.context.state !== 'running') { this.interrupt(); return; }
      this.transitioning = false; clearTimeout(this.watchdog);
      // play() resolved and the quiet seek completed. WebKit can retain
      // HAVE_CURRENT_DATA while its native clock advances; readiness alone
      // must not leave a playing song stuck behind the loading indicator.
      // Native waiting/stalled events report subsequent buffering.
      this.mixer.startSong(); this.state = 'playing';
      this.message = ''; this.burst(); this.emit(); this.positionState();
    }).catch(error => this.playRejected(error, token));
  }
  seekQuietly(position, signal) {
    return new Promise(resolve => {
      let timer;
      const done = () => { clearTimeout(timer); this.audio.removeEventListener('seeked', done); signal.removeEventListener('abort', done); resolve(); };
      this.audio.addEventListener('seeked', done, { once: true }); signal.addEventListener('abort', done, { once: true });
      timer = setTimeout(done, 1500);
      try { this.audio.currentTime = position; } catch { done(); }
    });
  }
  playRejected(error, token) {
    if (token !== this.generation || this.disposed || !this.wantsPlaying) return;
    if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') this.interrupt();
    else this.fileFailed();
  }
  pause(manual = true) {
    if (this.disposed) return;
    this.cancelAttempt(); this.wantsPlaying = false; this.mixer.songWanted = false;
    this.mixer.silenceSong(); this.audio.pause(); this.state = this.current ? 'paused' : 'idle';
    this.needsTap = !manual && !!this.current; this.resumeTarget = this.needsTap ? 'song' : '';
    this.message = this.needsTap ? 'your song is still here ♡' : '';
    this.mixer.restoreAmbient(); this.emit(); this.positionState();
  }
  interrupt() {
    if (!this.opened || this.disposed) return;
    if (this.wantsPlaying) this.pause(false);
    else if (this.resumeTarget !== 'song' && !this.mixer.hidden && this.mixer.context && this.mixer.context.state !== 'running') {
      this.needsTap = true; this.resumeTarget = 'ambient'; this.message = 'tap once for your background music ♡'; this.emit();
    }
  }
  continue() {
    if (this.current && this.resumeTarget !== 'ambient') this.play();
    else { this.mixer.wake(); this.mixer.restoreAmbient(); }
  }
  toggle() { if (this.wantsPlaying) this.pause(); else this.play(); }
  finish() {
    this.pause(); this.state = 'finished'; this.message = 'that was the last little song ♡'; this.emit();
  }
  next() { const next = this.current ? this.queue.next(this.current.id, this.failed) : this.queue.first(this.failed); if (next) this.select(next); else this.finish(); }
  previous() {
    if (!this.current) return;
    if (this.audio.currentTime > 3) { this.seek(0); return; }
    const id = this.queue.previous(this.current.id, this.failed); if (id) this.select(id);
  }
  seek(seconds) {
    if (!this.current || !Number.isFinite(this.audio.duration)) return;
    try { this.audio.currentTime = clamp(seconds, 0, this.audio.duration); this.emit(); this.positionState(); } catch { /* Metadata not ready. */ }
  }
  restart() { const first = this.queue.first(this.failed); if (first) this.select(first); }
  armWatchdog() {
    clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => {
      if (!this.wantsPlaying || this.disposed) return;
      if (!navigator.onLine) { this.pause(false); this.message = 'you’re offline — your song can wait ♡'; this.emit(); }
      else this.fileFailed();
    }, 20000);
  }
  fileFailed() {
    if (!this.current || this.disposed) return;
    clearTimeout(this.watchdog);
    const track = this.current;
    const resume = this.wantsPlaying;
    if (!this.usedFallback && track.fallbackAudio && this.audio.canPlayType('audio/mp4')) {
      this.cancelAttempt(); this.wantsPlaying = false; this.mixer.silenceSong(); this.audio.pause();
      this.usedFallback = true; this.sourcePath = track.fallbackAudio; this.audio.src = this.sourcePath;
      if (resume) this.play(); else this.pause(); return;
    }
    this.failed.add(track.id); this.pause();
    const next = this.queue.next(track.id, this.failed);
    if (next) { this.select(next, { autoplay: resume }); this.message = 'that song isn’t ready yet — trying the next one ♡'; }
    else { this.state = 'finished'; this.message = 'that song isn’t ready yet — the others are still here ♡'; }
    this.emit();
  }
  preloadNext() {
    const id = this.current && this.queue.next(this.current.id, this.failed, true);
    const track = this.config.tracks.find(t => t.id === id);
    const path = track?.audio ?? '';
    if (this.nextAudio.getAttribute('src') === path) return;
    this.nextAudio.pause(); this.nextAudio.preload = 'auto';
    if (path) this.nextAudio.src = this.nextAudio.canPlayType('audio/mpeg') ? path : track.fallbackAudio || path;
    else this.nextAudio.removeAttribute('src');
    this.nextAudio.load();
  }
  setShuffle(value) { this.queue.setShuffle(value, this.current?.id); this.preloadNext(); this.emit(); }
  cycleRepeat() { this.queue.repeat = { off: 'all', all: 'one', one: 'off' }[this.queue.repeat]; this.preloadNext(); this.emit(); }
  setMuted(value) { this.mixer.wake(); this.mixer.muted = value; this.mixer.restoreAmbient(); this.emit(); }
  setHidden(hidden) {
    this.mixer.hidden = hidden; this.mixer.restoreAmbient();
    if (!hidden && ((this.wantsPlaying && this.audio.paused) || this.mixer.context && this.mixer.context.state !== 'running')) this.interrupt();
  }
  installMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const handlers = {
      play: () => this.play(), pause: () => this.pause(), previoustrack: () => this.previous(), nexttrack: () => this.next(),
      seekto: event => this.seek(event.seekTime), seekbackward: event => this.seek(this.audio.currentTime - (event.seekOffset || 10)),
      seekforward: event => this.seek(this.audio.currentTime + (event.seekOffset || 10)), stop: () => this.pause(),
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* Unsupported action. */ }
    }
    this.mediaActions = Object.keys(handlers);
  }
  mediaMetadata() {
    if (!('mediaSession' in navigator) || !('MediaMetadata' in window) || !this.current) return;
    const cover = this.current.mediaCover || (this.current.cover && !this.current.cover.endsWith('.svg') ? this.current.cover : this.config.mediaCover);
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: this.current.title, artist: this.config.artist,
        album: this.config.title, artwork: cover ? [{ src: cover, sizes: '512x512' }] : [] });
    } catch { /* Song playback does not depend on lock-screen artwork support. */ }
  }
  mediaPlaybackState() {
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = this.state === 'playing' ? 'playing' : this.current ? 'paused' : 'none'; } catch { /* Older engine. */ }
    }
  }
  positionState() {
    if (!navigator.mediaSession?.setPositionState || !this.current) return;
    const duration = this.audio.duration;
    if (Number.isFinite(duration) && duration > 0) {
      try { navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position: clamp(this.audio.currentTime, 0, duration) }); } catch { /* Invalidated metadata on source change. */ }
    }
  }
  dispose() {
    if (this.disposed) return;
    this.cancelAttempt(); this.disposed = true; this.life.abort();
    this.mixer.dispose(); this.audio.pause(); this.nextAudio.pause();
    for (const audio of [this.audio, this.nextAudio]) { audio.removeAttribute('src'); audio.load(); }
    if ('mediaSession' in navigator) {
      for (const action of this.mediaActions || []) { try { navigator.mediaSession.setActionHandler(action, null); } catch { /* Unsupported. */ } }
      navigator.mediaSession.metadata = null;
    }
  }
}
