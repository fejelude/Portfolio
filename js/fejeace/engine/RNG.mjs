export class CryptoRNG {
  constructor(cryptoSource = globalThis.crypto) {
    if (!cryptoSource?.getRandomValues) {
      throw new Error("A cryptographically secure random source is required.");
    }
    this.cryptoSource = cryptoSource;
    this.buffer = new Uint32Array(128);
    this.index = this.buffer.length;
  }

  nextFloat() {
    if (this.index >= this.buffer.length) {
      this.cryptoSource.getRandomValues(this.buffer);
      this.index = 0;
    }
    return this.buffer[this.index++] / 0x1_0000_0000;
  }
}

export class SequenceRNG {
  constructor(sequence = [0]) {
    if (!sequence.length) throw new Error("SequenceRNG requires at least one value.");
    this.sequence = sequence.map((value) => Math.min(0.999999999, Math.max(0, Number(value))));
    this.index = 0;
  }

  nextFloat() {
    const value = this.sequence[this.index % this.sequence.length];
    this.index += 1;
    return value;
  }
}

export class SeededRNG {
  constructor(seed = 0x9e3779b9) {
    this.state = Number(seed) >>> 0 || 0x9e3779b9;
  }

  nextFloat() {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x1_0000_0000;
  }
}

export function weightedPick(weightMap, rng) {
  const entries = Object.entries(weightMap).filter(([, weight]) => Number(weight) > 0);
  const totalWeight = entries.reduce((total, [, weight]) => total + Number(weight), 0);
  if (!(totalWeight > 0)) throw new Error("Weighted selection requires positive weights.");

  let cursor = rng.nextFloat() * totalWeight;
  for (const [value, weight] of entries) {
    cursor -= Number(weight);
    if (cursor < 0) return value;
  }
  return entries[entries.length - 1][0];
}
