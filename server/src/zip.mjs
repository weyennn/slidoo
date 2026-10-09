import { inflateRawSync } from 'node:zlib';
import { UserError } from './errors.mjs';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
// A .docx body is a few MB of XML at most; this bounds a zip bomb.
const MAX_ENTRY_BYTES = 64 * 1024 * 1024;

/**
 * Read selected entries from a zip archive (enough for .docx: stored and
 * deflated entries, no zip64, no encryption).
 * @returns {Map<string, Buffer>} entries found, keyed by name
 */
export function readZipEntries(buffer, wanted) {
  const names = new Set(wanted);
  const found = new Map();

  let eocd = -1;
  const lowest = Math.max(0, buffer.length - 22 - 0xffff);
  for (let i = buffer.length - 22; i >= lowest; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new UserError('File ini bukan dokumen DOCX yang valid.');

  const total = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);

  for (let i = 0; i < total && found.size < names.size; i++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;

    if (!names.has(name)) continue;
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) {
      throw new UserError('File DOCX rusak dan tidak bisa dibaca.');
    }
    const dataStart =
      localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const data = buffer.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) {
      found.set(name, Buffer.from(data));
    } else if (method === 8) {
      try {
        found.set(name, inflateRawSync(data, { maxOutputLength: MAX_ENTRY_BYTES }));
      } catch {
        throw new UserError('File DOCX rusak atau terlalu besar untuk dibaca.');
      }
    } else {
      throw new UserError('File DOCX memakai kompresi yang tidak didukung.');
    }
  }
  return found;
}
