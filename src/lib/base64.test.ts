import { describe, expect, it } from 'vitest';
import { decode, encode } from './base64';

describe('encode/decode', () => {
  it('round-trips arbitrary text', () => {
    const text = 'Hello, Wordleb0t! Testing 123.';
    expect(decode(encode(text))).toBe(text);
  });

  it('produces a URL-safe string with no padding', () => {
    // Long enough input to be likely to contain +, /, or = in plain base64.
    const encoded = encode('any carnal pleasure.');
    expect(encoded).not.toMatch(/[+/=]/);
  });
});
