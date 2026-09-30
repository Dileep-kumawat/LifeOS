const fs = require('fs');
const path = require('path');

function createWavBuffer(sampleRate, durationSec, sampleFn) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // "fmt " sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // Mono (1 channel)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // "data" sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const val = Math.max(-1, Math.min(1, sampleFn(t, durationSec)));
    const int16 = Math.floor(val < 0 ? val * 0x8000 : val * 0x7FFF);
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  return buffer;
}

const SR = 44100;
const sfxDir = path.join(__dirname, '../public/sfx');
if (!fs.existsSync(sfxDir)) {
  fs.mkdirSync(sfxDir, { recursive: true });
}

// 1. pop.wav (bubble pop: pitch drop 600Hz -> 200Hz over 0.08s)
const popBuffer = createWavBuffer(SR, 0.08, (t) => {
  const freq = 600 - t * 4500;
  const env = Math.exp(-t * 40);
  return Math.sin(2 * Math.PI * freq * t) * env;
});
fs.writeFileSync(path.join(sfxDir, 'pop.wav'), popBuffer);

// 2. click.wav (crisp UI click: 0.03s)
const clickBuffer = createWavBuffer(SR, 0.03, (t) => {
  const env = Math.exp(-t * 120);
  return (Math.random() * 2 - 1) * env * 0.8;
});
fs.writeFileSync(path.join(sfxDir, 'click.wav'), clickBuffer);

// 3. tick.wav (soft dock tick: 0.04s)
const tickBuffer = createWavBuffer(SR, 0.04, (t) => {
  const freq = 1200;
  const env = Math.exp(-t * 90);
  return Math.sin(2 * Math.PI * freq * t) * env * 0.6;
});
fs.writeFileSync(path.join(sfxDir, 'tick.wav'), tickBuffer);

// 4. chime.wav (bright soft chime: 1.2s, C major triad)
const chimeBuffer = createWavBuffer(SR, 1.2, (t) => {
  const env = Math.exp(-t * 3.5);
  const f1 = Math.sin(2 * Math.PI * 1046.5 * t); // C6
  const f2 = Math.sin(2 * Math.PI * 1318.5 * t); // E6
  const f3 = Math.sin(2 * Math.PI * 1567.98 * t); // G6
  return (f1 * 0.4 + f2 * 0.35 + f3 * 0.25) * env * 0.7;
});
fs.writeFileSync(path.join(sfxDir, 'chime.wav'), chimeBuffer);

// 5. success.wav (confirm bell: two-tone 0.4s)
const successBuffer = createWavBuffer(SR, 0.45, (t) => {
  if (t < 0.12) {
    const env = Math.exp(-t * 20);
    return Math.sin(2 * Math.PI * 880 * t) * env * 0.6; // A5
  } else {
    const t2 = t - 0.12;
    const env = Math.exp(-t2 * 10);
    return Math.sin(2 * Math.PI * 1174.66 * t2) * env * 0.7; // D6
  }
});
fs.writeFileSync(path.join(sfxDir, 'success.wav'), successBuffer);

// 6. whoosh.wav (flashcard flip: 0.3s filtered sweep)
const whooshBuffer = createWavBuffer(SR, 0.35, (t) => {
  const env = Math.sin((t / 0.35) * Math.PI);
  const noise = (Math.random() * 2 - 1);
  const tone = Math.sin(2 * Math.PI * (200 + 400 * Math.sin(t * 10)) * t);
  return (noise * 0.5 + tone * 0.5) * env * 0.5;
});
fs.writeFileSync(path.join(sfxDir, 'whoosh.wav'), whooshBuffer);

// 7. hit.wav (montage cut soft thud: 0.18s)
const hitBuffer = createWavBuffer(SR, 0.2, (t) => {
  const freq = 140 - t * 450;
  const env = Math.exp(-t * 25);
  return Math.sin(2 * Math.PI * Math.max(40, freq) * t) * env * 0.8;
});
fs.writeFileSync(path.join(sfxDir, 'hit.wav'), hitBuffer);

// 8. riser.wav (2.0s riser from f90 to f150)
const riserBuffer = createWavBuffer(SR, 2.0, (t) => {
  const prog = t / 2.0;
  const freq = 180 + Math.pow(prog, 2) * 520;
  const env = Math.pow(prog, 1.5) * 0.6;
  return Math.sin(2 * Math.PI * freq * t) * env;
});
fs.writeFileSync(path.join(sfxDir, 'riser.wav'), riserBuffer);

// 9. public/music.mp3 placeholder (44s ambient track so remotion can bundle without error)
const musicPath = path.join(__dirname, '../public/music.mp3');
if (!fs.existsSync(musicPath)) {
  const musicBuffer = createWavBuffer(SR, 44.0, (t) => {
    // Very gentle soft ambient drone (432Hz pad) at low volume
    const chord = Math.sin(2 * Math.PI * 216 * t) * 0.2 +
                  Math.sin(2 * Math.PI * 270 * t) * 0.15 +
                  Math.sin(2 * Math.PI * 324 * t) * 0.15;
    return chord * 0.1;
  });
  // Remotion accepts audio files; if it's named music.mp3 with wav format,
  // let's also create music.wav or write the buffer to music.mp3 so staticFile('music.mp3') resolves.
  fs.writeFileSync(musicPath, musicBuffer);
}

console.log('Procedural placeholder audio files successfully generated!');
