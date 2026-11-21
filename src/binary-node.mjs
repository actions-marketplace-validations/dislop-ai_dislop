import { inflateRawSync } from "node:zlib";

const MAX_ZIP_ENTRIES = 3000;
const MAX_UNCOMPRESSED_BYTES = 120 * 1024 * 1024; // 120 MB zip-bomb ceiling

/**
 * Pure Node.js standard-library ZIP reader for OOXML (`.docx`, `.pptx`).
 * Parses the End of Central Directory (EOCD) and Central Directory entries.
 */
export function readZipXmlEntries(buffer) {
  if (buffer.length < 22 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("Invalid OOXML ZIP header");
  }

  // Locate EOCD signature 0x06054b50 within last 65 KB
  const minOffset = Math.max(0, buffer.length - 65557);
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= minOffset; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("Could not locate ZIP End-of-Central-Directory record");
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  if (totalEntries > MAX_ZIP_ENTRIES) {
    throw new Error(`Archive exceeds maximum entry cap (${totalEntries} > ${MAX_ZIP_ENTRIES})`);
  }

  const cdSize = buffer.readUInt32LE(eocdOffset + 12);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (cdOffset + cdSize > buffer.length) {
    throw new Error("Truncated ZIP central directory");
  }

  const entries = {};
  let totalUncompressed = 0;
  let ptr = cdOffset;

  for (let i = 0; i < totalEntries && ptr + 46 <= cdOffset + cdSize; i += 1) {
    if (buffer.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(ptr + 10);
    const compSize = buffer.readUInt32LE(ptr + 20);
    const uncompSize = buffer.readUInt32LE(ptr + 24);
    const nameLen = buffer.readUInt16LE(ptr + 28);
    const extraLen = buffer.readUInt16LE(ptr + 30);
    const commentLen = buffer.readUInt16LE(ptr + 32);
    const localHeaderOffset = buffer.readUInt32LE(ptr + 42);

    const name = buffer.subarray(ptr + 46, ptr + 46 + nameLen).toString("utf8");
    ptr += 46 + nameLen + extraLen + commentLen;

    if (!/\.(?:xml|rels)$/i.test(name)) continue;

    totalUncompressed += uncompSize;
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
      throw new Error("OOXML uncompressed XML payload exceeds 120 MB safety ceiling");
    }

    if (localHeaderOffset + 30 > buffer.length || buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      continue;
    }
    const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buffer.length) continue;

    const rawSlice = buffer.subarray(dataStart, dataEnd);
    let outBuf;
    if (method === 0) {
      outBuf = rawSlice;
    } else if (method === 8) {
      outBuf = inflateRawSync(rawSlice, { maxOutputLength: MAX_UNCOMPRESSED_BYTES });
    } else {
      continue;
    }
    entries[name] = outBuf.toString("utf8");
  }

  return entries;
}
