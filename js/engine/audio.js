// ── Procedural audio ───────────────────────────────────────────
// All music and effects are synthesized at runtime. No assets.
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.scene = null;
    this.timer = null;
    this.nextTime = 0;
    this.step = 0;
    this.noiseBuf = null;
    this.started = false;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.enabled ? 0.24 : 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.enabled ? 0.55 : 0;
    this.sfxGain.connect(this.master);
    // noise buffer for percussion / wind
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.started = true;
    if (this.pendingScene) this.setScene(this.pendingScene, true);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.linearRampToValueAtTime(on ? .24 : 0, t + .4);
    this.sfxGain.gain.linearRampToValueAtTime(on ? .55 : 0, t + .2);
  }

  setScene(name, force = false) {
    if (!this.ctx) { this.pendingScene = name; return; }
    if (this.scene === name && !force) return;
    this.scene = name;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + .1;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 90);
  }

  tick() {
    if (!this.ctx || !this.scene) return;
    const ahead = this.ctx.currentTime + .35;
    while (this.nextTime < ahead) {
      this.schedule(this.nextTime, this.step);
      const tempo = this.tempoFor();
      this.nextTime += 60 / tempo / 2; // eighth notes
      this.step++;
    }
  }

  tempoFor() {
    if (this.scene === 'battle') return 148;
    if (this.scene === 'boss') return 164;
    if (this.scene === 'title') return 56;
    if (this.scene === 'ending') return 60;
    return 66;
  }

  chordFor(step) {
    const bar = Math.floor(step / 8) % 4;
    const prog = {
      title: [[146.83, 220, 261.63, 329.63], [130.81, 196, 246.94, 293.66], [110, 164.81, 220, 261.63], [98, 146.83, 196, 246.94]],
      explore: [[220, 277.18, 329.63, 440], [174.61, 220, 261.63, 349.23], [196, 246.94, 293.66, 392], [164.81, 207.65, 246.94, 329.63]],
      forest: [[164.81, 196, 246.94, 329.63], [130.81, 164.81, 196, 261.63], [146.83, 185, 220, 293.66], [110, 146.83, 185, 246.94]],
      mire: [[146.83, 174.61, 220, 261.63], [116.54, 146.83, 174.61, 220], [130.81, 155.56, 196, 246.94], [123.47, 146.83, 185, 233.08]],
      peaks: [[130.81, 155.56, 196, 233.08], [103.83, 130.81, 155.56, 207.65], [116.54, 146.83, 174.61, 233.08], [98, 123.47, 155.56, 196]],
      citadel: [[146.83, 174.61, 220, 277.18], [138.59, 164.81, 207.65, 261.63], [110, 138.59, 164.81, 220], [123.47, 146.83, 185, 246.94]],
      battle: [[110, 146.83, 164.81, 220], [98, 130.81, 146.83, 196], [116.54, 146.83, 174.61, 220], [87.31, 110, 130.81, 174.61]],
      boss: [[73.42, 110, 146.83, 174.61], [69.3, 103.83, 138.59, 164.81], [77.78, 116.54, 155.56, 185], [61.74, 92.5, 123.47, 146.83]],
      ending: [[174.61, 220, 261.63, 349.23], [196, 246.94, 293.66, 392], [130.81, 164.81, 220, 261.63], [146.83, 185, 220, 293.66]],
    };
    return (prog[this.scene] || prog.explore)[bar];
  }

  pad(freqs, time, dur, gain = .035, type = 'sine') {
    for (let i = 0; i < freqs.length; i++) {
      const f = freqs[i];
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = (Math.random() - .5) * 8;
      g.gain.setValueAtTime(0, time + i * .02);
      g.gain.linearRampToValueAtTime(gain / (i + 1.5), time + i * .02 + .5);
      g.gain.linearRampToValueAtTime(0, time + dur);
      o.connect(g); g.connect(this.musicGain);
      o.start(time); o.stop(time + dur + .05);
    }
  }

  pluck(freq, time, gain = .05, type = 'triangle', dur = .8) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + .01);
    g.gain.exponentialRampToValueAtTime(.0001, time + dur);
    o.connect(g); g.connect(this.musicGain);
    o.start(time); o.stop(time + dur + .02);
  }

  noise(time, gain = .03, dur = .12, freq = 1200, q = .8) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = freq; flt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(.0001, time + dur);
    src.connect(flt); flt.connect(g); g.connect(this.musicGain);
    src.start(time); src.stop(time + dur + .02);
  }

  bass(freq, time, gain = .05, dur = .4) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + .02);
    g.gain.exponentialRampToValueAtTime(.0001, time + dur);
    o.connect(g); g.connect(this.musicGain);
    o.start(time); o.stop(time + dur + .03);
  }

  schedule(time, step) {
    const s = this.scene;
    const chord = this.chordFor(step);
    const beat = step % 8;
    if (beat === 0) this.pad(chord, time, (60 / this.tempoFor()) * 4.1, s === 'battle' || s === 'boss' ? .05 : .04);
    if (s === 'battle' || s === 'boss') {
      if (beat === 0 || beat === 4) this.bass(chord[0] / 2, time, .09, .3);
      if (beat % 2 === 0) this.noise(time, s === 'boss' ? .05 : .035, .09, 900, 1.2);
      if (beat === 2 || beat === 6) this.noise(time, .025, .15, 3200, 1.5);
      if (beat === 0 || beat === 3 || beat === 5) this.pluck(chord[2] * 2, time, .035, 'sawtooth', .35);
      if (s === 'boss' && beat === 6) this.pluck(chord[3] * 2, time, .03, 'square', .5);
    } else {
      if ((beat === 0 || beat === 3 || beat === 6) && s !== 'title') {
        const notes = chord;
        this.pluck(notes[Math.floor(Math.random() * notes.length)] * 2, time, .028, 'sine', 1.6);
      }
      if (beat === 0 && s === 'title') this.pluck(chord[1] * 2, time, .035, 'sine', 3.4);
      if (beat === 4 && s === 'mire') this.noise(time, .012, .8, 2400, .6);
      if (beat === 6 && s === 'forest') this.pluck(chord[3] * 4, time, .014, 'sine', 1.8);
      if (beat === 2 && s === 'citadel') this.bass(chord[0] / 2, time, .045, 1.2);
    }
  }

  // ── s fx ──────────────────────────────────────────────────
  tone(freq, dur = .12, type = 'sine', gain = .1, slide = null, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + .02);
  }

  burst(dur = .2, gain = .12, freq = 1600, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.setValueAtTime(freq, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(80, freq * .18), t + dur);
    flt.Q.value = .9;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + .05);
  }

  sfx(name) {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'click': this.tone(660, .05, 'sine', .05); break;
      case 'confirm': this.tone(520, .08, 'triangle', .09); this.tone(780, .1, 'sine', .07, null, .06); break;
      case 'cancel': this.tone(300, .09, 'sine', .07, 220); break;
      case 'step': this.burst(.06, .018, 420); break;
      case 'hit': this.burst(.16, .11, 900); this.tone(90, .12, 'sine', .12, 50); break;
      case 'crit': this.burst(.22, .16, 1500); this.tone(180, .2, 'square', .09, 70); break;
      case 'heal': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .5, 'sine', .045, null, i * .06)); break;
      case 'magic': this.tone(320, .4, 'sine', .08, 900); this.burst(.3, .05, 2600); break;
      case 'fire': this.burst(.34, .14, 800); this.tone(120, .3, 'sawtooth', .04, 60); break;
      case 'thunder': this.burst(.3, .16, 3000); this.tone(70, .28, 'square', .07, 40); break;
      case 'ice': this.tone(1600, .25, 'sine', .05, 2200); this.burst(.18, .04, 4200); break;
      case 'debuff': this.tone(300, .3, 'sawtooth', .04, 120); break;
      case 'guard': this.tone(200, .16, 'square', .05); break;
      case 'miss': this.burst(.1, .05, 2200); break;
      case 'chest': [392, 523, 659, 784].forEach((f, i) => this.tone(f, .4, 'triangle', .06, null, i * .08)); break;
      case 'level': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, .7, 'sine', .05, null, i * .1)); break;
      case 'victory': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, .8, 'triangle', .05, null, i * .13)); break;
      case 'defeat': [330, 294, 262, 196].forEach((f, i) => this.tone(f, 1, 'sine', .06, null, i * .2)); break;
      case 'crystal': [784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 1.2, 'sine', .035, null, i * .12)); break;
      case 'portal': this.tone(220, .5, 'sine', .06, 880); this.burst(.5, .05, 1400); break;
      case 'page': this.tone(440, .05, 'triangle', .03); break;
      case 'error': this.tone(180, .15, 'square', .05, 120); break;
      case 'equip': this.tone(240, .07, 'square', .04); this.tone(360, .1, 'triangle', .04, null, .05); break;
      case 'levelup': [392, 587, 784].forEach((f, i) => this.tone(f, .4, 'triangle', .05, null, i * .09)); break;
    }
  }
}

export const audio = new AudioEngine();
