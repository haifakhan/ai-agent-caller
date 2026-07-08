const BIAS = 0x84;
const CLIP = 32635;

export function pcm16leToMuLaw(pcm: Buffer): Buffer {
  const out = Buffer.alloc(Math.floor(pcm.length / 2));
  for (let i = 0; i < out.length; i += 1) {
    const sample = pcm.readInt16LE(i * 2);
    out[i] = linearToMuLaw(sample);
  }
  return out;
}

function linearToMuLaw(sample: number): number {
  let sign = (sample >> 8) & 0x80;
  if (sign !== 0) {
    sample = -sample;
  }
  if (sample > CLIP) {
    sample = CLIP;
  }
  sample += BIAS;

  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; mask >>= 1) {
    exponent -= 1;
  }

  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  const muLawByte = ~(sign | (exponent << 4) | mantissa);
  return muLawByte & 0xff;
}
