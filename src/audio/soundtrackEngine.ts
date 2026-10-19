/**
 * PolyDimension Web Audio Generative Synthesizer Engine
 * Synchronized with 3D model rotation and thematic parameters
 */

export interface TrackMetadata {
  title: string;
  keySignature: string;
  bpm: number;
  scaleNotes: number[];
  moodDescription: string;
  synthesisConfig: {
    arpeggioSpeed: number;
    bassCutoff: number;
    reverbDecay: number;
    resonance: number;
  };
}

class SoundtrackEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private timerId: any = null;
  private currentStep: number = 0;
  private volumeNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private currentTrack: TrackMetadata | null = null;
  private onStateChangeCallbacks: Array<(isPlaying: boolean) => void> = [];

  constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master output volume
      this.volumeNode = this.ctx.createGain();
      this.volumeNode.gain.setValueAtTime(0.35, this.ctx.currentTime);

      // Master resonant filter
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(4.0, this.ctx.currentTime);

      this.filterNode.connect(this.volumeNode);
      this.volumeNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setTrack(track: TrackMetadata) {
    this.currentTrack = track;
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
  }

  public getTrack(): TrackMetadata | null {
    return this.currentTrack;
  }

  public play() {
    this.initContext();
    if (!this.ctx || !this.volumeNode || !this.filterNode) return;

    if (this.isPlaying) return;
    this.isPlaying = true;
    this.notifyState();

    const track = this.currentTrack || {
      title: 'Neon Synapse Overdrive',
      keySignature: 'F# Minor',
      bpm: 124,
      scaleNotes: [185.0, 220.0, 246.94, 277.18, 329.63, 369.99, 440.0],
      moodDescription: 'Analog synth with crystalline arpeggios',
      synthesisConfig: {
        arpeggioSpeed: 0.12,
        bassCutoff: 500,
        reverbDecay: 3.0,
        resonance: 5.0,
      },
    };

    const notes = track.scaleNotes.length > 0 ? track.scaleNotes : [220, 277.18, 329.63, 440];
    const intervalMs = (60 / track.bpm / 2) * 1000;

    // Sub-bass drone oscillator
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(notes[0] / 2, this.ctx.currentTime);
    bassGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    bassOsc.connect(bassGain);
    bassGain.connect(this.filterNode);
    bassOsc.start();

    // Arpeggio sequencer loop
    this.timerId = setInterval(() => {
      if (!this.ctx || !this.isPlaying || !this.filterNode) return;

      const now = this.ctx.currentTime;
      const noteFreq = notes[this.currentStep % notes.length];
      this.currentStep++;

      // Synth Lead Voice
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = this.currentStep % 2 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(noteFreq, now);

      // ADSR Envelope
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (intervalMs / 1000) * 0.9);

      osc.connect(gain);
      gain.connect(this.filterNode);

      osc.start(now);
      osc.stop(now + (intervalMs / 1000));
    }, intervalMs);

    // Save bass osc reference for cleanup
    (this as any)._bassOsc = bassOsc;
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if ((this as any)._bassOsc) {
      try {
        (this as any)._bassOsc.stop();
      } catch (e) {}
      (this as any)._bassOsc = null;
    }
    this.notifyState();
  }

  public toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  public setVolume(val: number) {
    if (this.volumeNode && this.ctx) {
      this.volumeNode.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public subscribe(cb: (playing: boolean) => void) {
    this.onStateChangeCallbacks.push(cb);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyState() {
    this.onStateChangeCallbacks.forEach((cb) => cb(this.isPlaying));
  }
}

export const soundtrackEngine = new SoundtrackEngine();
