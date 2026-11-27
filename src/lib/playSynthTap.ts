// lib/playSynthTap.ts
"use client";

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * 0.04); // 40ms buffer
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

export interface KioskTapOptions {
  boost?: number;
  bodyStartHz?: number;
  bodyEndHz?: number;
  filterCutoffHz?: number;
  durationSec?: number;
  bodyVolume?: number;
  noiseVolume?: number;
}

export function playSynthTap({
  boost = 1.8,
  bodyStartHz = 720,
  bodyEndHz = 240,
  filterCutoffHz = 2400,
  durationSec = 0.045,
  bodyVolume = 0.65,
  noiseVolume = 0.2,
}: KioskTapOptions = {}) {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  const now = audioCtx.currentTime;

  // Limiter prevents harsh distortion when boosting gain above 1.0
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-10, now);
  compressor.knee.setValueAtTime(6, now);
  compressor.ratio.setValueAtTime(8, now);
  compressor.attack.setValueAtTime(0.001, now);
  compressor.release.setValueAtTime(0.05, now);

  // Boost gain node
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(boost, now);

  // Shared lowpass filter to keep the tap soft and non-harsh
  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(filterCutoffHz, now);
  lowpass.Q.setValueAtTime(1.1, now);

  lowpass.connect(masterGain);
  masterGain.connect(compressor);
  compressor.connect(audioCtx.destination);

  // 1. Tactile body (short pitch drop)
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(bodyStartHz, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(80, bodyEndHz), now + durationSec);

  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.linearRampToValueAtTime(bodyVolume, now + 0.002);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(oscGain);
  oscGain.connect(lowpass);
  osc.start(now);
  osc.stop(now + durationSec + 0.005);

  // 2. Subtle tactile transient (very short filtered noise)
  if (noiseVolume > 0) {
    const noiseDuration = Math.min(0.02, durationSec * 0.5);
    const noise = audioCtx.createBufferSource();
    noise.buffer = getNoiseBuffer(audioCtx);

    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(2400, now);
    bandpass.Q.setValueAtTime(1.2, now);

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(noiseVolume, now + 0.001);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseDuration);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(lowpass);

    noise.start(now);
    noise.stop(now + noiseDuration + 0.005);
  }
}