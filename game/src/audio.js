// Synthesised sound for Gobble Run: every effect and the little banjo-ish title tune is
// built with the Web Audio API, so the game ships no audio files and makes no network
// request. Audio starts only after the player's first gesture (browsers require it).

/** Notes of the title tune, as [midi, beats]; a cheerful farmyard lope in C major. */
const TUNE = [
  [72, 0.5], [76, 0.5], [79, 0.5], [76, 0.5], [72, 0.5], [67, 1],
  [69, 0.5], [72, 0.5], [74, 0.5], [72, 0.5], [69, 0.5], [67, 1],
  [72, 0.5], [76, 0.5], [79, 0.5], [81, 0.5], [79, 0.5], [76, 0.5], [74, 1],
  [72, 1], [67, 1], [60, 2],
];

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function createAudio() {
  let context = null;
  let master = null;
  let musicTimer = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
    return true;
  }

  /** A short oscillator blip with a pitch slide and a quick decay. */
  function blip({ type = 'sine', from = 440, to = null, seconds = 0.15, volume = 0.25, when = 0 }) {
    if (!context || muted) return;
    const t0 = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + seconds);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  /** Filtered noise, for whooshes, flames and the farmer's stomp. */
  function noise({ seconds = 0.2, volume = 0.2, lowpass = 1200, when = 0 }) {
    if (!context || muted) return;
    const t0 = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
  }

  return {
    /** Call from any user gesture; safe to call repeatedly. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** The turkey's signature: two quick descending gobbles. */
    gobble() {
      blip({ type: 'sawtooth', from: 320, to: 180, seconds: 0.12, volume: 0.16 });
      blip({ type: 'sawtooth', from: 260, to: 140, seconds: 0.14, volume: 0.16, when: 0.13 });
      blip({ type: 'sawtooth', from: 300, to: 170, seconds: 0.1, volume: 0.12, when: 0.28 });
    },
    flap() {
      noise({ seconds: 0.12, volume: 0.14, lowpass: 900 });
      blip({ type: 'triangle', from: 300, to: 520, seconds: 0.1, volume: 0.1 });
    },
    jump() {
      blip({ type: 'triangle', from: 280, to: 560, seconds: 0.14, volume: 0.16 });
    },
    dash() {
      noise({ seconds: 0.18, volume: 0.2, lowpass: 2400 });
    },
    corn() {
      blip({ type: 'sine', from: 880, to: 880, seconds: 0.08, volume: 0.2 });
      blip({ type: 'sine', from: 1318, to: 1318, seconds: 0.12, volume: 0.2, when: 0.07 });
    },
    hit() {
      blip({ type: 'square', from: 220, to: 60, seconds: 0.25, volume: 0.25 });
      noise({ seconds: 0.2, volume: 0.22, lowpass: 700 });
    },
    hide() {
      noise({ seconds: 0.35, volume: 0.12, lowpass: 500 });
      blip({ type: 'sine', from: 500, to: 700, seconds: 0.15, volume: 0.1, when: 0.2 });
    },
    caught() {
      blip({ type: 'sawtooth', from: 400, to: 90, seconds: 0.7, volume: 0.28 });
      blip({ type: 'sawtooth', from: 300, to: 70, seconds: 0.7, volume: 0.2, when: 0.1 });
      noise({ seconds: 0.5, volume: 0.18, lowpass: 500, when: 0.05 });
    },
    escaped() {
      const notes = [72, 76, 79, 84, 79, 84, 88];
      notes.forEach((midi, i) => {
        blip({ type: 'triangle', from: midiToHz(midi), seconds: 0.22, volume: 0.22, when: i * 0.12 });
      });
    },
    stageUp() {
      blip({ type: 'triangle', from: 660, seconds: 0.12, volume: 0.18 });
      blip({ type: 'triangle', from: 990, seconds: 0.2, volume: 0.18, when: 0.11 });
    },
    startMusic() {
      if (!ensure() || musicTimer !== null) return;
      let index = 0;
      let nextAt = context.currentTime + 0.05;
      const beat = 0.32;
      musicTimer = window.setInterval(() => {
        if (muted || !context) return;
        while (nextAt < context.currentTime + 0.25) {
          const [midi, beats] = TUNE[index % TUNE.length];
          blip({ type: 'triangle', from: midiToHz(midi), seconds: beat * beats * 0.9, volume: 0.09, when: nextAt - context.currentTime });
          blip({ type: 'sine', from: midiToHz(midi - 12), seconds: beat * beats, volume: 0.05, when: nextAt - context.currentTime });
          nextAt += beat * beats;
          index += 1;
        }
      }, 90);
    },
    stopMusic() {
      if (musicTimer !== null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
}
