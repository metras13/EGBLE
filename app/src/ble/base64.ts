/**
 * EGBLE - minimal base64 for BLE payloads
 *
 * react-native-ble-plx moves characteristic values as base64 strings. Our
 * payloads are short JSON, so a small self-contained codec avoids pulling in a
 * Buffer polyfill. Handles UTF-8.
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeBase64(input: string): string {
  const bytes = utf8Bytes(input);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += CHARS[b0 >> 2];
    out += CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? CHARS[b2 & 63] : '=';
  }
  return out;
}

export function decodeBase64(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n0 = CHARS.indexOf(clean[i]);
    const n1 = CHARS.indexOf(clean[i + 1]);
    const n2 = CHARS.indexOf(clean[i + 2]);
    const n3 = CHARS.indexOf(clean[i + 3]);
    bytes.push((n0 << 2) | (n1 >> 4));
    if (n2 >= 0) bytes.push(((n1 & 15) << 4) | (n2 >> 2));
    if (n3 >= 0) bytes.push(((n2 & 3) << 6) | n3);
  }
  return utf8Decode(bytes);
}

function utf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return bytes;
}

function utf8Decode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
    } else if (b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else {
      out += String.fromCharCode(
        ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f),
      );
      i += 3;
    }
  }
  return out;
}
