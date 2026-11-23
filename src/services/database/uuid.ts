/**
 * Generates an RFC 9562 compliant UUIDv7.
 *
 * UUIDv7 structure:
 * - 48 bits: Unix timestamp in milliseconds
 * - 4 bits: Version (0b0111 = 7)
 * - 12 bits: Pseudo-random data / sequence counter
 * - 2 bits: Variant (0b10 = RFC 4122/9562)
 * - 62 bits: Pseudo-random data
 *
 * Benefits for SQLite:
 * - Time-sortable: monotonically increases with time, ensuring new rows append
 *   to the right edge of B-tree leaf pages instead of causing random page splits.
 * - Optimal index locality and cache utilization on flash storage.
 * - Retains 74 bits of cryptographically strong entropy for collision resistance.
 */
export function generateUuidV7(): string {
  const now = Date.now();
  const bytes = new Uint8Array(16);

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // 48-bit timestamp in milliseconds (big-endian)
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // Version 7: set bits 4-7 of byte 6 to 0111 (0x70)
  bytes[6] = (bytes[6] & 0x0f) | 0x70;

  // Variant 1: set bits 6-7 of byte 8 to 10 (0x80)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Format as 8-4-4-4-12 hex string
  let hex = '';
  for (let i = 0; i < 16; i++) {
    const h = bytes[i].toString(16).padStart(2, '0');
    if (i === 4 || i === 6 || i === 8 || i === 10) {
      hex += '-';
    }
    hex += h;
  }
  return hex;
}
