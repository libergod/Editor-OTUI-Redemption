// Minimal LZMA1 decoder, needed to read OTClient's sprite sheets.
//
// Tibia asset sprite sheets ship as `.bmp.lzma`: a 32-byte CIP header followed
// by an LZMA1 stream. There is no browser API for this and pulling in a general
// compression library for one format is not worth it, so this is a direct port
// of the reference LZMA decoder (LzmaSpec.cpp) limited to what the format needs.

const NUM_BIT_MODEL_TOTAL_BITS = 11;
const NUM_MOVE_BITS = 5;
const PROB_INIT = (1 << NUM_BIT_MODEL_TOTAL_BITS) / 2;
const TOP_VALUE = 1 << 24;

const NUM_POS_BITS_MAX = 4;
const NUM_STATES = 12;
const END_POS_MODEL_INDEX = 14;
const NUM_FULL_DISTANCES = 1 << (END_POS_MODEL_INDEX >> 1);
const NUM_ALIGN_BITS = 4;
const MATCH_MIN_LEN = 2;

function newProbs(size: number): Uint16Array {
  return new Uint16Array(size).fill(PROB_INIT);
}

class RangeDecoder {
  private code = 0;
  private range = 0xffffffff;
  private pos: number;

  constructor(private readonly input: Uint8Array, start: number) {
    this.pos = start + 1; // the first stream byte is always ignored
    for (let i = 0; i < 4; i++) this.code = ((this.code << 8) | this.byte()) >>> 0;
  }

  private byte(): number {
    return this.pos < this.input.length ? this.input[this.pos++] : 0;
  }

  private normalize(): void {
    if (this.range < TOP_VALUE) {
      this.range = (this.range << 8) >>> 0;
      this.code = ((this.code << 8) | this.byte()) >>> 0;
    }
  }

  decodeBit(probs: Uint16Array, index: number): number {
    const prob = probs[index];
    const bound = ((this.range >>> NUM_BIT_MODEL_TOTAL_BITS) * prob) >>> 0;
    if (this.code >>> 0 < bound) {
      this.range = bound;
      probs[index] = prob + (((1 << NUM_BIT_MODEL_TOTAL_BITS) - prob) >>> NUM_MOVE_BITS);
      this.normalize();
      return 0;
    }
    this.range = (this.range - bound) >>> 0;
    this.code = (this.code - bound) >>> 0;
    probs[index] = prob - (prob >>> NUM_MOVE_BITS);
    this.normalize();
    return 1;
  }

  decodeDirectBits(count: number): number {
    let result = 0;
    for (let i = 0; i < count; i++) {
      this.range = this.range >>> 1;
      this.code = (this.code - this.range) >>> 0;
      const mask = -(this.code >>> 31);
      this.code = (this.code + (this.range & mask)) >>> 0;
      result = ((result << 1) + (mask + 1)) >>> 0;
      this.normalize();
    }
    return result >>> 0;
  }

  decodeBitTree(probs: Uint16Array, offset: number, numBits: number): number {
    let m = 1;
    for (let i = 0; i < numBits; i++) m = (m << 1) + this.decodeBit(probs, offset + m);
    return m - (1 << numBits);
  }

  decodeBitTreeReverse(probs: Uint16Array, offset: number, numBits: number): number {
    let m = 1;
    let symbol = 0;
    for (let i = 0; i < numBits; i++) {
      const bit = this.decodeBit(probs, offset + m);
      m = (m << 1) + bit;
      symbol |= bit << i;
    }
    return symbol;
  }
}

/** Length decoder shared by the match and rep-match paths. */
class LenDecoder {
  private readonly choice = newProbs(2);
  private readonly low = newProbs(16 << 3);
  private readonly mid = newProbs(16 << 3);
  private readonly high = newProbs(256);

  decode(rc: RangeDecoder, posState: number): number {
    if (rc.decodeBit(this.choice, 0) === 0) return rc.decodeBitTree(this.low, posState << 3, 3);
    if (rc.decodeBit(this.choice, 1) === 0) return 8 + rc.decodeBitTree(this.mid, posState << 3, 3);
    return 16 + rc.decodeBitTree(this.high, 0, 8);
  }
}

export interface LzmaParams {
  lc: number;
  lp: number;
  pb: number;
}

/**
 * Decodes a raw LZMA1 stream of unknown length.
 * `outputLimit` caps the output buffer, guarding against corrupt input.
 */
export function decodeLzma1(
  input: Uint8Array,
  start: number,
  { lc, lp, pb }: LzmaParams,
  outputLimit: number,
): Uint8Array {
  const rc = new RangeDecoder(input, start);

  const litProbs = newProbs(0x300 << (lc + lp));
  const isMatch = newProbs(NUM_STATES << NUM_POS_BITS_MAX);
  const isRep = newProbs(NUM_STATES);
  const isRepG0 = newProbs(NUM_STATES);
  const isRepG1 = newProbs(NUM_STATES);
  const isRepG2 = newProbs(NUM_STATES);
  const isRep0Long = newProbs(NUM_STATES << NUM_POS_BITS_MAX);
  const posSlot = newProbs(4 << 6);
  const posDecoders = newProbs(1 + NUM_FULL_DISTANCES - END_POS_MODEL_INDEX);
  const alignDecoder = newProbs(1 << NUM_ALIGN_BITS);
  const lenDecoder = new LenDecoder();
  const repLenDecoder = new LenDecoder();

  const out = new Uint8Array(outputLimit);
  let outPos = 0;
  let state = 0;
  let rep0 = 0;
  let rep1 = 0;
  let rep2 = 0;
  let rep3 = 0;

  const posMask = (1 << pb) - 1;
  const literalPosMask = (1 << lp) - 1;

  while (outPos < outputLimit) {
    const posState = outPos & posMask;

    if (rc.decodeBit(isMatch, (state << NUM_POS_BITS_MAX) + posState) === 0) {
      // Literal
      const prevByte = outPos > 0 ? out[outPos - 1] : 0;
      const litState = ((outPos & literalPosMask) << lc) + (prevByte >>> (8 - lc));
      const probsOffset = 0x300 * litState;

      let symbol = 1;
      if (state >= 7) {
        let matchByte = out[outPos - rep0 - 1];
        do {
          const matchBit = (matchByte >>> 7) & 1;
          matchByte = (matchByte << 1) & 0xff;
          const bit = rc.decodeBit(litProbs, probsOffset + ((1 + matchBit) << 8) + symbol);
          symbol = (symbol << 1) | bit;
          if (matchBit !== bit) break;
        } while (symbol < 0x100);
      }
      while (symbol < 0x100) symbol = (symbol << 1) | rc.decodeBit(litProbs, probsOffset + symbol);

      out[outPos++] = symbol & 0xff;
      state = state < 4 ? 0 : state < 10 ? state - 3 : state - 6;
      continue;
    }

    let len: number;
    if (rc.decodeBit(isRep, state) !== 0) {
      // Repeated match
      if (outPos === 0) throw new Error('LZMA: rep match before any output');
      if (rc.decodeBit(isRepG0, state) === 0) {
        if (rc.decodeBit(isRep0Long, (state << NUM_POS_BITS_MAX) + posState) === 0) {
          state = state < 7 ? 9 : 11;
          out[outPos] = out[outPos - rep0 - 1];
          outPos++;
          continue;
        }
      } else {
        let dist: number;
        if (rc.decodeBit(isRepG1, state) === 0) {
          dist = rep1;
        } else {
          if (rc.decodeBit(isRepG2, state) === 0) {
            dist = rep2;
          } else {
            dist = rep3;
            rep3 = rep2;
          }
          rep2 = rep1;
        }
        rep1 = rep0;
        rep0 = dist;
      }
      len = repLenDecoder.decode(rc, posState) + MATCH_MIN_LEN;
      state = state < 7 ? 8 : 11;
    } else {
      // New match
      rep3 = rep2;
      rep2 = rep1;
      rep1 = rep0;
      len = lenDecoder.decode(rc, posState) + MATCH_MIN_LEN;
      state = state < 7 ? 7 : 10;

      const lenToPosState = Math.min(len - MATCH_MIN_LEN, 3);
      const slot = rc.decodeBitTree(posSlot, lenToPosState << 6, 6);
      if (slot < 4) {
        rep0 = slot;
      } else {
        const directBits = (slot >> 1) - 1;
        rep0 = (2 | (slot & 1)) << directBits;
        if (slot < END_POS_MODEL_INDEX) {
          rep0 += rc.decodeBitTreeReverse(posDecoders, rep0 - slot, directBits);
        } else {
          rep0 += rc.decodeDirectBits(directBits - NUM_ALIGN_BITS) * (1 << NUM_ALIGN_BITS);
          rep0 += rc.decodeBitTreeReverse(alignDecoder, 0, NUM_ALIGN_BITS);
        }
      }
      // 0xFFFFFFFF marks the end-of-stream marker.
      if (rep0 === 0xffffffff || rep0 >>> 0 === 0xffffffff) break;
    }

    if (rep0 >= outPos) throw new Error('LZMA: distance exceeds output');
    const copyEnd = Math.min(outPos + len, outputLimit);
    while (outPos < copyEnd) {
      out[outPos] = out[outPos - rep0 - 1];
      outPos++;
    }
  }

  return out.subarray(0, outPos);
}

/**
 * Parses CIP's 32-byte sprite-sheet header and decodes the LZMA1 stream after it.
 *
 * Header layout: a run of NUL padding, the marker 70 0A FA 80 24, a 7-bit
 * encoded size, then the LZMA properties byte, dictionary size and an 8-byte
 * CIP length field.
 */
export function decodeCipLzma(bytes: Uint8Array, outputLimit: number): Uint8Array {
  let pos = 0;
  while (pos < bytes.length && bytes[pos] === 0x00) pos++;
  pos += 5; // constant marker
  while (pos < bytes.length && (bytes[pos++] & 0x80) === 0x80);

  const lclppb = bytes[pos++];
  const lc = lclppb % 9;
  const remainder = Math.floor(lclppb / 9);
  const lp = remainder % 5;
  const pb = Math.floor(remainder / 5);

  pos += 4; // dictionary size (the decoder keeps the whole output in memory)
  pos += 8; // CIP compressed size

  return decodeLzma1(bytes, pos, { lc, lp, pb }, outputLimit);
}
