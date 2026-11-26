import { deflateRawSync, inflateRawSync, inflateSync } from "node:zlib";

const MAX_ZIP_ENTRIES = 3000;
const MAX_UNCOMPRESSED_BYTES = 120 * 1024 * 1024; // 120 MB zip-bomb guard

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) >>> 0 : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32Buffer(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function assertSafeEntryName(name) {
  if (!name || name.includes("\0") || name.startsWith("/") || name.startsWith("\\")) {
    throw new Error(`Unsafe ZIP entry path: ${JSON.stringify(name)}`);
  }
  const parts = name.replace(/\\/g, "/").split("/");
  if (parts.some((p) => p === "..")) {
    throw new Error(`Path traversal detected in ZIP entry: ${JSON.stringify(name)}`);
  }
}

/**
 * Parse all entries in a PKZIP / OOXML archive buffer.
 * Returns ordered entry records including raw compressed bytes and decoded UTF-8 XML strings for `.xml`/`.rels`.
 */
export function readZipArchive(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("Invalid OOXML ZIP header");
  }
  if (buffer[2] === 0x05 && buffer[3] === 0x06 && buffer.readUInt16LE(10) === 0) {
    return { entries: [], xmlEntries: {} };
  }

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

  const entries = [];
  const xmlEntries = {};
  let totalUncompressed = 0;
  let ptr = cdOffset;

  for (let i = 0; i < totalEntries && ptr + 46 <= cdOffset + cdSize; i += 1) {
    if (buffer.readUInt32LE(ptr) !== 0x02014b50) {
      throw new Error("Corrupted ZIP central directory entry signature");
    }
    const versionNeeded = buffer.readUInt16LE(ptr + 6);
    const flags = buffer.readUInt16LE(ptr + 8);
    const method = buffer.readUInt16LE(ptr + 10);
    const modTime = buffer.readUInt16LE(ptr + 12);
    const modDate = buffer.readUInt16LE(ptr + 14);
    const crc32 = buffer.readUInt32LE(ptr + 16);
    const compSize = buffer.readUInt32LE(ptr + 20);
    const uncompSize = buffer.readUInt32LE(ptr + 24);
    const nameLen = buffer.readUInt16LE(ptr + 28);
    const extraLen = buffer.readUInt16LE(ptr + 30);
    const commentLen = buffer.readUInt16LE(ptr + 32);
    const externalAttrs = buffer.readUInt32LE(ptr + 38);
    const localHeaderOffset = buffer.readUInt32LE(ptr + 42);

    const name = buffer.subarray(ptr + 46, ptr + 46 + nameLen).toString("utf8");
    assertSafeEntryName(name);
    ptr += 46 + nameLen + extraLen + commentLen;

    if ((flags & 0x01) !== 0) {
      throw new Error("Encrypted OOXML archives are not supported");
    }

    if (localHeaderOffset + 30 > buffer.length || buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error(`Invalid local file header for ZIP entry '${name}'`);
    }
    const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buffer.length) {
      throw new Error(`Truncated compressed payload for ZIP entry '${name}'`);
    }

    const compressedSlice = buffer.subarray(dataStart, dataEnd);
    const isXml = /\.(?:xml|rels)$/i.test(name);
    let text = null;

    if (isXml) {
      totalUncompressed += uncompSize;
      if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
        throw new Error("OOXML uncompressed XML payload exceeds 120 MB safety ceiling");
      }
      let uncompBuf;
      if (method === 0) {
        uncompBuf = compressedSlice;
      } else if (method === 8) {
        uncompBuf = inflateRawSync(compressedSlice, { maxOutputLength: MAX_UNCOMPRESSED_BYTES });
      } else {
        throw new Error(`Unsupported ZIP compression method ${method} in '${name}'`);
      }
      text = uncompBuf.toString("utf8");
      if (/<!DOCTYPE\b/i.test(text) || /<!ENTITY\b/i.test(text)) {
        throw new Error(`Blocked XML DOCTYPE/ENTITY declaration in '${name}'`);
      }
      xmlEntries[name] = text;
    }

    entries.push({
      name,
      versionNeeded,
      flags: flags & ~0x08, // normalize away streaming data-descriptor bit on repack
      method,
      modTime,
      modDate,
      crc32,
      compSize,
      uncompSize,
      externalAttrs,
      compressedData: compressedSlice,
      text,
    });
  }

  return { entries, xmlEntries };
}

/**
 * Build a PKZIP archive buffer from a `{ [entryName]: Buffer | string }` map (used by tests & repack).
 */
export function buildZipArchive(entryMap) {
  const names = Object.keys(entryMap);
  const records = names.map((name) => {
    assertSafeEntryName(name);
    const raw = Buffer.isBuffer(entryMap[name]) ? entryMap[name] : Buffer.from(String(entryMap[name]), "utf8");
    const compressed = raw.length > 0 ? deflateRawSync(raw) : Buffer.alloc(0);
    const method = raw.length > 0 ? 8 : 0;
    return {
      name,
      versionNeeded: 20,
      flags: 0,
      method,
      modTime: 0,
      modDate: 0x21,
      crc32: crc32Buffer(raw),
      compSize: compressed.length,
      uncompSize: raw.length,
      externalAttrs: 0,
      compressedData: compressed,
    };
  });
  return serializeZipRecords(records);
}

/**
 * Repack an existing ZIP archive, replacing only modified UTF-8 XML entries while preserving
 * all unmodified binary entries byte-for-byte.
 */
export function repackZipArchive(originalBuffer, updatedXmlMap) {
  const { entries } = readZipArchive(originalBuffer);
  const records = entries.map((entry) => {
    if (!Object.prototype.hasOwnProperty.call(updatedXmlMap, entry.name)) {
      return entry;
    }
    const raw = Buffer.from(String(updatedXmlMap[entry.name]), "utf8");
    const compressed = raw.length > 0 ? deflateRawSync(raw) : Buffer.alloc(0);
    return {
      ...entry,
      versionNeeded: 20,
      flags: entry.flags & ~0x08,
      method: raw.length > 0 ? 8 : 0,
      crc32: crc32Buffer(raw),
      compSize: compressed.length,
      uncompSize: raw.length,
      compressedData: compressed,
    };
  });
  return serializeZipRecords(records);
}

function serializeZipRecords(records) {
  const localChunks = [];
  const cdChunks = [];
  let offset = 0;

  for (const rec of records) {
    const nameBuf = Buffer.from(rec.name, "utf8");
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(rec.versionNeeded || 20, 4);
    localHeader.writeUInt16LE(rec.flags || 0, 6);
    localHeader.writeUInt16LE(rec.method, 8);
    localHeader.writeUInt16LE(rec.modTime || 0, 10);
    localHeader.writeUInt16LE(rec.modDate || 0x21, 12);
    localHeader.writeUInt32LE(rec.crc32 >>> 0, 14);
    localHeader.writeUInt32LE(rec.compSize >>> 0, 18);
    localHeader.writeUInt32LE(rec.uncompSize >>> 0, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const localOffset = offset;
    localChunks.push(localHeader, nameBuf, rec.compressedData);
    offset += localHeader.length + nameBuf.length + rec.compressedData.length;

    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0);
    cdHeader.writeUInt16LE(20, 4);
    cdHeader.writeUInt16LE(rec.versionNeeded || 20, 6);
    cdHeader.writeUInt16LE(rec.flags || 0, 8);
    cdHeader.writeUInt16LE(rec.method, 10);
    cdHeader.writeUInt16LE(rec.modTime || 0, 12);
    cdHeader.writeUInt16LE(rec.modDate || 0x21, 14);
    cdHeader.writeUInt32LE(rec.crc32 >>> 0, 16);
    cdHeader.writeUInt32LE(rec.compSize >>> 0, 20);
    cdHeader.writeUInt32LE(rec.uncompSize >>> 0, 24);
    cdHeader.writeUInt16LE(nameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);
    cdHeader.writeUInt16LE(0, 32);
    cdHeader.writeUInt16LE(0, 34);
    cdHeader.writeUInt16LE(0, 36);
    cdHeader.writeUInt32LE(rec.externalAttrs || 0, 38);
    cdHeader.writeUInt32LE(localOffset >>> 0, 42);

    cdChunks.push(cdHeader, nameBuf);
  }

  const cdBuf = Buffer.concat(cdChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(records.length, 8);
  eocd.writeUInt16LE(records.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset >>> 0, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, cdBuf, eocd]);
}

/**
 * Extract lightweight metadata from PNG/JPEG/WebP/GIF images without external dependencies.
 */
export function inspectImageBuffer(buffer, format) {
  const metaTexts = [];
  let width = 0;
  let height = 0;

  if (format === "png" && buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    width = buffer.readUInt32BE(16);
    height = buffer.readUInt32BE(20);
    let pos = 8;
    while (pos + 12 <= buffer.length) {
      const len = buffer.readUInt32BE(pos);
      const type = buffer.subarray(pos + 4, pos + 8).toString("latin1");
      const dataStart = pos + 8;
      const dataEnd = dataStart + len;
      if (dataEnd + 4 > buffer.length) break;
      if (type === "tEXt" || type === "iTXt") {
        metaTexts.push(buffer.subarray(dataStart, dataEnd).toString("utf8"));
      } else if (type === "zTXt") {
        const nul = buffer.indexOf(0, dataStart);
        if (nul !== -1 && nul + 2 < dataEnd) {
          try {
            const inf = inflateSync(buffer.subarray(nul + 2, dataEnd), { maxOutputLength: 1024 * 1024 });
            metaTexts.push(inf.toString("utf8"));
          } catch {
            // ignore malformed zTXt
          }
        }
      } else if (type === "caBX") {
        metaTexts.push("c2pa");
      }
      pos = dataEnd + 4;
      if (type === "IEND") break;
    }
  } else if (format === "gif" && buffer.length >= 10 && buffer.subarray(0, 3).toString("ascii") === "GIF") {
    width = buffer.readUInt16LE(6);
    height = buffer.readUInt16LE(8);
  } else {
    const asciiScan = buffer.subarray(0, Math.min(buffer.length, 262144)).toString("latin1");
    metaTexts.push(asciiScan);
  }

  const joined = metaTexts.join("\n");
  const aiWorkflowResidue =
    /\bSteps:\s*\d+,\s*Sampler:/i.test(joined) ||
    /"class_type"\s*:\s*"KSampler"/i.test(joined) ||
    /\bComfyUI\b/i.test(joined);
  const c2paPresent = /\bc2pa\b|urn:c2pa/i.test(joined);

  return {
    width,
    height,
    aiWorkflowResidue,
    c2paPresent,
  };
}

const MAX_STREAM_UNCOMPRESSED_BYTES = 16 * 1024 * 1024;

function decodeUtf16BeHex(hexRaw) {
  const clean = hexRaw.replace(/[^0-9a-fA-F]/g, "");
  if (!clean) return "";
  const padded = clean.length % 2 === 1 ? `${clean}0` : clean;
  const start = /^feff/i.test(padded) && padded.length >= 4 ? 4 : 0;
  let out = "";
  for (let i = start; i + 3 < padded.length; i += 4) {
    const code = parseInt(padded.slice(i, i + 4), 16);
    if (code === 0) continue;
    if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 7 < padded.length) {
        const low = parseInt(padded.slice(i + 4, i + 8), 16);
        if (low >= 0xdc00 && low <= 0xdfff) {
          out += String.fromCodePoint(0x10000 + (((code - 0xd800) << 10) | (low - 0xdc00)));
          i += 4;
          continue;
        }
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    out += String.fromCharCode(code);
  }
  return out;
}

function decodePdfLiteralString(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    i += 1;
    if (i >= raw.length) break;
    const esc = raw[i];
    if (esc === "n") out += "\n";
    else if (esc === "r") out += "\r";
    else if (esc === "t") out += "\t";
    else if (esc === "b") out += "\b";
    else if (esc === "f") out += "\f";
    else if (esc === "(" || esc === ")" || esc === "\\") out += esc;
    else if (esc === "\r" && raw[i + 1] === "\n") i += 1;
    else if (esc === "\n" || esc === "\r") continue;
    else if (esc >= "0" && esc <= "7") {
      const oct = raw.slice(i, i + 3).match(/^[0-7]{1,3}/)[0];
      out += String.fromCharCode(parseInt(oct, 8));
      i += oct.length - 1;
    } else {
      out += esc;
    }
  }
  return out;
}

function decodePdfUnicodeLiteral(raw) {
  const bytesStr = decodePdfLiteralString(raw);
  if (bytesStr.length >= 4 && bytesStr.charCodeAt(0) === 0xfe && bytesStr.charCodeAt(1) === 0xff) {
    let hex = "";
    for (let i = 2; i < bytesStr.length; i += 1) {
      hex += (bytesStr.charCodeAt(i) & 0xff).toString(16).padStart(2, "0");
    }
    return decodeUtf16BeHex(hex);
  }
  return bytesStr;
}

function decodePdfHexString(hexRaw) {
  const clean = hexRaw.replace(/[^0-9a-fA-F]/g, "");
  if (!clean) return "";
  const padded = clean.length % 2 === 1 ? `${clean}0` : clean;
  if (/^feff/i.test(padded) && padded.length >= 8) {
    return decodeUtf16BeHex(padded);
  }
  let out = "";
  for (let i = 0; i + 1 < padded.length; i += 2) {
    const code = parseInt(padded.slice(i, i + 2), 16);
    if (code >= 0x20 && code <= 0x7e) out += String.fromCharCode(code);
    else if (code === 0x0a || code === 0x0d || code === 0x09) out += " ";
  }
  return out;
}

const AGL_GLYPH_MAP = {
  space: " ", exclam: "!", quotedbl: '"', numbersign: "#", dollar: "$", percent: "%",
  ampersand: "&", quotesingle: "'", parenleft: "(", parenright: ")", asterisk: "*", plus: "+",
  comma: ",", hyphen: "-", period: ".", slash: "/", zero: "0", one: "1", two: "2",
  three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  colon: ":", semicolon: ";", less: "<", equal: "=", greater: ">", question: "?", at: "@",
  bracketleft: "[", backslash: "\\", bracketright: "]", underscore: "_", braceleft: "{",
  bar: "|", braceright: "}", asciitilde: "~", endash: "\u2013", emdash: "\u2014", bullet: "\u2022",
};

function parseToUnicodeCMap(cmapText) {
  const map = new Map();
  const ranges = [];
  const codespaces = [];
  const lenSet = new Set();
  if (!cmapText) return { map, ranges, codespaces, byteLens: [] };

  for (const sec of cmapText.matchAll(/begincodespacerange\b([\s\S]*?)endcodespacerange/g)) {
    for (const pm of sec[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const sHex = pm[1].toLowerCase();
      const eHex = pm[2].toLowerCase();
      if (sHex.length === eHex.length && sHex.length >= 2 && sHex.length % 2 === 0) {
        const byteLen = sHex.length / 2;
        codespaces.push({ byteLen, start: parseInt(sHex, 16), end: parseInt(eHex, 16) });
        lenSet.add(byteLen);
      }
    }
  }

  for (const sec of cmapText.matchAll(/beginbfchar\b([\s\S]*?)endbfchar/g)) {
    for (const pm of sec[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const src = pm[1].toLowerCase();
      const dst = decodeUtf16BeHex(pm[2]);
      if (src.length >= 2 && src.length % 2 === 0 && dst) {
        map.set(src, dst);
        lenSet.add(src.length / 2);
      }
    }
  }

  for (const sec of cmapText.matchAll(/beginbfrange\b([\s\S]*?)endbfrange/g)) {
    const body = sec[1];
    const rangeRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:\[([\s\S]*?)\]|<([0-9a-fA-F]+)>)/g;
    let rm;
    while ((rm = rangeRe.exec(body)) !== null) {
      const startHex = rm[1].toLowerCase();
      const endHex = rm[2].toLowerCase();
      if (startHex.length !== endHex.length || startHex.length % 2 !== 0) continue;
      const startCode = parseInt(startHex, 16);
      const endCode = parseInt(endHex, 16);
      if (!(endCode >= startCode)) continue;
      const byteLen = startHex.length / 2;
      lenSet.add(byteLen);

      if (rm[3] !== undefined) {
        const items = [...rm[3].matchAll(/<([0-9a-fA-F]+)>/g)].map((m) => decodeUtf16BeHex(m[1]));
        ranges.push({ startCode, endCode, byteLen, items, prefixHex: null, baseLastUnit: 0 });
      } else if (rm[4] !== undefined) {
        const dstBaseHex = rm[4];
        if (dstBaseHex.length < 4) continue;
        ranges.push({
          startCode,
          endCode,
          byteLen,
          items: null,
          prefixHex: dstBaseHex.slice(0, -4),
          baseLastUnit: parseInt(dstBaseHex.slice(-4), 16),
        });
      }
    }
  }

  return { map, ranges, codespaces, byteLens: Array.from(lenSet).sort((a, b) => b - a) };
}

function glyphNameToChar(rawName) {
  if (!rawName) return "";
  const name = rawName.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  if (Object.hasOwn(AGL_GLYPH_MAP, name)) return AGL_GLYPH_MAP[name];
  if (name.length === 1 && /[A-Za-z0-9]/.test(name)) return name;
  const uni = name.match(/^uni((?:[0-9a-fA-F]{4})+)$/);
  if (uni) return decodeUtf16BeHex(uni[1]);
  const uhex = name.match(/^u([0-9a-fA-F]{4,6})$/);
  if (uhex) {
    const cp = parseInt(uhex[1], 16);
    return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
  }
  return "";
}

function parseEncodingDifferences(fontDictRaw, objects) {
  let encDict = "";
  const refM = fontDictRaw.match(/\/Encoding\s+(\d+)\s+\d+\s+R/);
  if (refM && objects.has(Number(refM[1]))) {
    encDict = objects.get(Number(refM[1])).dictRaw || "";
  } else {
    const inlineM = fontDictRaw.match(/\/Encoding\s*<<([\s\S]*?)>>/);
    if (inlineM) encDict = inlineM[1];
  }
  if (!encDict) return null;
  const diffM = encDict.match(/\/Differences\s*\[([\s\S]*?)\]/);
  if (!diffM) return null;
  const map = new Map();
  let curCode = 0;
  for (const tok of diffM[1].matchAll(/(\d+)|\/([^\s\x00/[\]()<>]+)/g)) {
    if (tok[1] !== undefined) {
      curCode = Number(tok[1]);
    } else if (tok[2] !== undefined) {
      const ch = glyphNameToChar(tok[2]);
      if (ch) map.set(curCode, ch);
      curCode += 1;
    }
  }
  return map.size > 0 ? map : null;
}

function lookupRangeCMap(ranges, code, byteLen) {
  for (const r of ranges) {
    if (r.byteLen !== byteLen) continue;
    if (code < r.startCode || code > r.endCode) continue;
    const offset = code - r.startCode;
    if (r.items) return offset < r.items.length ? r.items[offset] : "";
    const unitHex = ((r.baseLastUnit + offset) & 0xffff).toString(16).padStart(4, "0");
    return decodeUtf16BeHex(r.prefixHex + unitHex);
  }
  return "";
}

function decodeHexViaToUnicode(hexLower, toUnicode) {
  let out = "";
  let pos = 0;
  const codespaces = toUnicode.codespaces || [];
  const byteLens = toUnicode.byteLens || [];
  const stepMin = (byteLens[byteLens.length - 1] || 1) * 2;
  while (pos < hexLower.length) {
    let consumed = 0;
    if (codespaces.length > 0) {
      let csMatched = false;
      for (const cs of codespaces) {
        const hLen = cs.byteLen * 2;
        if (pos + hLen <= hexLower.length) {
          const key = hexLower.slice(pos, pos + hLen);
          const codeVal = parseInt(key, 16);
          if (codeVal >= cs.start && codeVal <= cs.end) {
            if (toUnicode.map.has(key)) out += toUnicode.map.get(key);
            else if (toUnicode.ranges?.length > 0) out += lookupRangeCMap(toUnicode.ranges, codeVal, cs.byteLen);
            pos += hLen;
            consumed = hLen;
            csMatched = true;
            break;
          }
        }
      }
      if (csMatched) continue;
    }
    let matched = false;
    for (const bLen of byteLens) {
      const hLen = bLen * 2;
      if (pos + hLen <= hexLower.length) {
        const key = hexLower.slice(pos, pos + hLen);
        if (toUnicode.map.has(key)) {
          out += toUnicode.map.get(key);
          pos += hLen;
          matched = true;
          break;
        }
        if (toUnicode.ranges?.length > 0) {
          const rVal = lookupRangeCMap(toUnicode.ranges, parseInt(key, 16), bLen);
          if (rVal) {
            out += rVal;
            pos += hLen;
            matched = true;
            break;
          }
        }
      }
    }
    if (!matched && !consumed) pos += stepMin;
  }
  return out;
}

function decodePdfHexWithFont(hexRaw, fontEntry) {
  const clean = hexRaw.replace(/[^0-9a-fA-F]/g, "");
  if (!clean) return "";
  const padded = (clean.length % 2 === 1 ? `${clean}0` : clean).toLowerCase();
  if (/^feff/.test(padded) && padded.length >= 8) return decodeUtf16BeHex(padded);
  if (fontEntry?.toUnicode && (fontEntry.toUnicode.map.size > 0 || (fontEntry.toUnicode.ranges?.length || 0) > 0)) {
    return decodeHexViaToUnicode(padded, fontEntry.toUnicode);
  }
  if (fontEntry?.differences && fontEntry.differences.size > 0) {
    let out = "";
    for (let i = 0; i + 1 < padded.length; i += 2) {
      const code = parseInt(padded.slice(i, i + 2), 16);
      if (fontEntry.differences.has(code)) out += fontEntry.differences.get(code);
      else if (!fontEntry.isCustomGlyph && code >= 0x20 && code <= 0x7e) out += String.fromCharCode(code);
    }
    return out;
  }
  if (fontEntry?.isCustomGlyph) return "";
  return decodePdfHexString(hexRaw);
}

function decodePdfLiteralWithFont(raw, fontEntry) {
  const bytesStr = decodePdfLiteralString(raw);
  if (bytesStr.length >= 4 && bytesStr.charCodeAt(0) === 0xfe && bytesStr.charCodeAt(1) === 0xff) {
    return decodePdfUnicodeLiteral(raw);
  }
  if (fontEntry?.toUnicode && (fontEntry.toUnicode.map.size > 0 || (fontEntry.toUnicode.ranges?.length || 0) > 0)) {
    let hex = "";
    for (let i = 0; i < bytesStr.length; i += 1) {
      hex += (bytesStr.charCodeAt(i) & 0xff).toString(16).padStart(2, "0");
    }
    return decodeHexViaToUnicode(hex, fontEntry.toUnicode);
  }
  if (fontEntry?.differences && fontEntry.differences.size > 0) {
    let out = "";
    for (let i = 0; i < bytesStr.length; i += 1) {
      const code = bytesStr.charCodeAt(i) & 0xff;
      if (fontEntry.differences.has(code)) out += fontEntry.differences.get(code);
      else if (!fontEntry.isCustomGlyph && code >= 0x20 && code <= 0x7e) out += String.fromCharCode(code);
    }
    return out;
  }
  if (fontEntry?.isCustomGlyph) return "";
  return bytesStr;
}

function readPdfLiteralAt(src, openIdx) {
  let depth = 1;
  let i = openIdx + 1;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    i += 1;
  }
  return { raw: src.slice(openIdx + 1, Math.max(openIdx + 1, i - 1)), endIdx: i };
}

function parseMediaBoxRect(dictText) {
  const m = dictText.match(/\/MediaBox\s*\[\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\]/);
  if (!m) return null;
  const w = Math.abs(Number(m[3]) - Number(m[1]));
  const h = Math.abs(Number(m[4]) - Number(m[2]));
  if (!(w > 0 && h > 0)) return null;
  return [w, h];
}

function decodeAsciiHex(buf) {
  const bytes = [];
  let hi = -1;
  for (let i = 0; i < buf.length; i += 1) {
    const c = buf[i];
    if (c === 0x3e) break; // '>'
    let v = -1;
    if (c >= 0x30 && c <= 0x39) v = c - 0x30;
    else if (c >= 0x41 && c <= 0x46) v = c - 0x37;
    else if (c >= 0x61 && c <= 0x66) v = c - 0x57;
    else continue;
    if (hi === -1) hi = v;
    else {
      bytes.push((hi << 4) | v);
      hi = -1;
    }
  }
  if (hi !== -1) bytes.push(hi << 4);
  return Buffer.from(bytes);
}

function decodeAscii85(buf) {
  const out = [];
  const tuple = [];
  for (let i = 0; i < buf.length; i += 1) {
    const c = buf[i];
    if (c === 0x7e && buf[i + 1] === 0x3e) break; // '~>'
    if (c <= 0x20) continue;
    if (c === 0x7a && tuple.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    if (c < 0x21 || c > 0x75) continue;
    tuple.push(c - 0x21);
    if (tuple.length === 5) {
      const val =
        (((tuple[0] * 85 + tuple[1]) * 85 + tuple[2]) * 85 + tuple[3]) * 85 + tuple[4];
      out.push((val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff);
      tuple.length = 0;
    }
  }
  if (tuple.length >= 2) {
    const k = tuple.length;
    while (tuple.length < 5) tuple.push(84);
    const val =
      (((tuple[0] * 85 + tuple[1]) * 85 + tuple[2]) * 85 + tuple[3]) * 85 + tuple[4];
    const extra = [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff];
    for (let j = 0; j < k - 1; j += 1) out.push(extra[j]);
  }
  return Buffer.from(out);
}

function extractPdfFilterList(dictRaw) {
  const arrM = dictRaw.match(/\/Filter\s*\[([\s\S]*?)\]/);
  if (arrM) {
    return [...arrM[1].matchAll(/\/([A-Za-z0-9]+)/g)].map((m) => m[1]);
  }
  const singleM = dictRaw.match(/\/Filter\s*\/([A-Za-z0-9]+)/);
  return singleM ? [singleM[1]] : [];
}

function decodeObjectStream(obj) {
  if (!obj || !obj.streamBytes) return "";
  let bytes = obj.streamBytes;
  const filters = extractPdfFilterList(obj.dictRaw || "");
  for (const fName of filters) {
    if (fName === "ASCII85Decode" || fName === "A85") {
      bytes = decodeAscii85(bytes);
    } else if (fName === "ASCIIHexDecode" || fName === "AHx") {
      bytes = decodeAsciiHex(bytes);
    } else if (fName === "FlateDecode" || fName === "Fl") {
      try {
        bytes = inflateSync(bytes, { maxOutputLength: MAX_STREAM_UNCOMPRESSED_BYTES });
      } catch {
        try {
          bytes = inflateRawSync(bytes, { maxOutputLength: MAX_STREAM_UNCOMPRESSED_BYTES });
        } catch {
          return "";
        }
      }
    } else {
      return "";
    }
  }
  return bytes.toString("latin1");
}

function extractPdfObjects(buffer) {
  const latin = buffer.toString("latin1");
  const objects = new Map();
  const objRe = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;

  while ((m = objRe.exec(latin)) !== null) {
    const objNum = Number(m[1]);
    const bodyStart = m.index + m[0].length;
    const endObjIdx = latin.indexOf("endobj", bodyStart);
    if (endObjIdx === -1) break;

    const streamTagIdx = latin.slice(bodyStart, endObjIdx).indexOf("stream");
    let dictPart = "";
    let streamBytes = null;
    let nextPos = endObjIdx + 6;

    if (streamTagIdx !== -1) {
      const absStreamTagIdx = bodyStart + streamTagIdx;
      dictPart = latin.slice(bodyStart, absStreamTagIdx);
      let sStart = absStreamTagIdx + 6;
      if (latin[sStart] === "\r" && latin[sStart + 1] === "\n") sStart += 2;
      else if (latin[sStart] === "\n" || latin[sStart] === "\r") sStart += 1;

      const lenMatch = dictPart.match(/\/Length\s+(\d+)\b(?!\s+\d+\s+R)/);
      let sEnd = -1;
      if (lenMatch) {
        const candEnd = sStart + Number(lenMatch[1]);
        if (candEnd <= buffer.length) {
          sEnd = candEnd;
          const afterStream = latin.indexOf("endstream", sEnd);
          const realEndObj = afterStream !== -1 ? latin.indexOf("endobj", afterStream) : -1;
          if (realEndObj !== -1) nextPos = realEndObj + 6;
        }
      }
      if (sEnd === -1) {
        const endStreamIdx = latin.indexOf("endstream", sStart);
        if (endStreamIdx !== -1) {
          sEnd = endStreamIdx;
          if (sEnd > sStart && latin[sEnd - 1] === "\n") sEnd -= 1;
          if (sEnd > sStart && latin[sEnd - 1] === "\r") sEnd -= 1;
          const realEndObj = latin.indexOf("endobj", endStreamIdx);
          if (realEndObj !== -1) nextPos = realEndObj + 6;
        }
      }
      if (sEnd >= sStart) streamBytes = buffer.subarray(sStart, sEnd);
    } else {
      dictPart = latin.slice(bodyStart, endObjIdx);
    }

    objects.set(objNum, { objNum, dictRaw: dictPart, streamBytes });
    objRe.lastIndex = nextPos;
  }

  for (const obj of Array.from(objects.values())) {
    if (!obj.streamBytes || !/\/Type\s*\/ObjStm\b/.test(obj.dictRaw)) continue;
    const nMatch = obj.dictRaw.match(/\/N\s+(\d+)/);
    const firstMatch = obj.dictRaw.match(/\/First\s+(\d+)/);
    if (!nMatch || !firstMatch) continue;
    const count = Number(nMatch[1]);
    const first = Number(firstMatch[1]);
    const streamText = decodeObjectStream(obj);
    if (!streamText || first <= 0 || first > streamText.length || count <= 0) continue;
    const headerNums = streamText.slice(0, first).match(/\d+/g) || [];
    const pairs = [];
    for (let k = 0; k + 1 < headerNums.length && pairs.length < count; k += 2) {
      pairs.push({ objNum: Number(headerNums[k]), absStart: first + Number(headerNums[k + 1]) });
    }
    const sortedStarts = [...pairs].sort((a, b) => a.absStart - b.absStart);
    for (let k = 0; k < sortedStarts.length; k += 1) {
      const cur = sortedStarts[k];
      if (cur.absStart < first || cur.absStart >= streamText.length) continue;
      const nextStart = k + 1 < sortedStarts.length ? sortedStarts[k + 1].absStart : streamText.length;
      const body = streamText.slice(cur.absStart, Math.max(cur.absStart, Math.min(streamText.length, nextStart))).trim();
      if (!objects.has(cur.objNum) && body) {
        objects.set(cur.objNum, { objNum: cur.objNum, dictRaw: body, streamBytes: null, fromObjStm: true });
      }
    }
  }

  return { latin, objects };
}

function readPdfDictAt(src, openIdx) {
  let depth = 1;
  let j = openIdx + 2;
  while (j < src.length && depth > 0) {
    if (src[j] === "(") {
      j = readPdfLiteralAt(src, j).endIdx;
      continue;
    }
    if (src[j] === "<" && src[j + 1] === "<") {
      depth += 1;
      j += 2;
      continue;
    }
    if (src[j] === "<") {
      const close = src.indexOf(">", j + 1);
      j = close !== -1 ? close + 1 : j + 1;
      continue;
    }
    if (src[j] === ">" && src[j + 1] === ">") {
      depth -= 1;
      j += 2;
      continue;
    }
    j += 1;
  }
  return { raw: src.slice(openIdx, j), endIdx: j };
}

function extractActualTextFromPropDict(dictRaw) {
  const mIdx = dictRaw.search(/\/ActualText(?=\s|[<(])/);
  if (mIdx === -1) return null;
  let j = mIdx + "/ActualText".length;
  while (j < dictRaw.length && /\s/.test(dictRaw[j])) j += 1;
  if (dictRaw[j] === "<" && dictRaw[j + 1] !== "<") {
    const close = dictRaw.indexOf(">", j + 1);
    if (close !== -1) {
      const hex = dictRaw.slice(j + 1, close).replace(/\s+/g, "");
      if (/^feff/i.test(hex)) return decodeUtf16BeHex(hex);
      return decodePdfHexString(hex);
    }
  } else if (dictRaw[j] === "(") {
    return decodePdfUnicodeLiteral(readPdfLiteralAt(dictRaw, j).raw);
  }
  return null;
}

function isPdfWs(ch) {
  return ch === " " || ch === "\n" || ch === "\r" || ch === "\t" || ch === "\f" || ch === "\x00";
}

function isPdfDelimiter(ch) {
  return !ch || isPdfWs(ch) || ch === "/" || ch === "[" || ch === "]" || ch === "(" || ch === ")" || ch === "<" || ch === ">" || ch === "{" || ch === "}" || ch === "%";
}

function skipPdfWs(str, pos) {
  let p = pos;
  while (p < str.length && isPdfWs(str[p])) p += 1;
  return p;
}

function readPdfOpAt(str, pos) {
  const start = skipPdfWs(str, pos);
  let end = start;
  while (end < str.length && !isPdfDelimiter(str[end])) end += 1;
  return { op: str.slice(start, end), endIdx: end };
}

function stripInlineImagesLinear(streamText) {
  const out = [];
  let pos = 0;
  const len = streamText.length;
  while (pos < len) {
    const biIdx = streamText.indexOf("BI", pos);
    if (biIdx === -1) {
      out.push(streamText.slice(pos));
      break;
    }
    const prevOk = biIdx === 0 || isPdfDelimiter(streamText[biIdx - 1]);
    const nextOk = biIdx + 2 < len && isPdfWs(streamText[biIdx + 2]);
    if (!prevOk || !nextOk) {
      out.push(streamText.slice(pos, biIdx + 2));
      pos = biIdx + 2;
      continue;
    }
    const idIdx = streamText.indexOf("ID", biIdx + 3);
    if (idIdx === -1 || !(isPdfWs(streamText[idIdx - 1]) && idIdx + 2 < len && isPdfWs(streamText[idIdx + 2]))) {
      out.push(streamText.slice(pos, biIdx + 2));
      pos = biIdx + 2;
      continue;
    }
    let searchFrom = idIdx + 3;
    let eiIdx = -1;
    while (searchFrom < len) {
      const cand = streamText.indexOf("EI", searchFrom);
      if (cand === -1) break;
      const beforeCh = streamText[cand - 1];
      const afterCh = cand + 2 < len ? streamText[cand + 2] : "";
      if (isPdfWs(beforeCh) && (!afterCh || isPdfDelimiter(afterCh))) {
        eiIdx = cand;
        break;
      }
      searchFrom = cand + 2;
    }
    if (eiIdx === -1) {
      out.push(streamText.slice(pos, biIdx + 2));
      pos = biIdx + 2;
      continue;
    }
    out.push(streamText.slice(pos, biIdx), " ");
    pos = eiIdx + 2;
  }
  return out.join("");
}

function resolvePageFontMap(resText, objects, fontCache) {
  const fontMap = new Map();
  const fontRefs = [];
  for (const inlineM of resText.matchAll(/\/Font\s*<<([\s\S]*?)>>/g)) {
    for (const fm of inlineM[1].matchAll(/\/([A-Za-z0-9_+.-]+)\s+(\d+)\s+\d+\s+R/g)) {
      fontRefs.push([fm[1], Number(fm[2])]);
    }
  }
  for (const refM of resText.matchAll(/\/Font\s+(\d+)\s+\d+\s+R/g)) {
    const fDictObj = objects.get(Number(refM[1]));
    if (fDictObj) {
      for (const fm of fDictObj.dictRaw.matchAll(/\/([A-Za-z0-9_+.-]+)\s+(\d+)\s+\d+\s+R/g)) {
        fontRefs.push([fm[1], Number(fm[2])]);
      }
    }
  }

  for (const [alias, fObjNum] of fontRefs) {
    if (fontCache.has(fObjNum)) {
      fontMap.set(alias, fontCache.get(fObjNum));
      continue;
    }
    const fObj = objects.get(fObjNum);
    if (!fObj) continue;
    let fullDict = fObj.dictRaw || "";
    const descM = fullDict.match(/\/DescendantFonts\s*\[\s*(\d+)\s+\d+\s+R/);
    if (descM && objects.has(Number(descM[1]))) {
      fullDict += `\n${objects.get(Number(descM[1])).dictRaw || ""}`;
    }
    let toUnicode = null;
    const tuM = fullDict.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
    if (tuM && objects.has(Number(tuM[1]))) {
      const cmapStr = decodeObjectStream(objects.get(Number(tuM[1])));
      const parsed = parseToUnicodeCMap(cmapStr);
      if (parsed.map.size > 0 || parsed.ranges.length > 0) toUnicode = parsed;
    }
    const differences = parseEncodingDifferences(fullDict, objects);
    const hasStdBaseEnc = /\/BaseEncoding\s*\/(?:WinAnsiEncoding|MacRomanEncoding|StandardEncoding)\b/.test(fullDict);
    const isCustomGlyph =
      (/\/Subtype\s*\/(?:Type3|Type0)\b|\/Identity-[HV]\b/.test(fullDict) || Boolean(toUnicode)) &&
      !hasStdBaseEnc;
    const baseFontMatch = fullDict.match(/\/BaseFont\s*\/([^\s/[\]()<>]+)/);
    const baseFont = baseFontMatch ? baseFontMatch[1] : "";
    const isMono = /(?:Courier|Menlo|Monaco|Consolas|Mono|FiraCode|JetBrainsMono|Inconsolata|SFMono)/i.test(baseFont);
    const entry = { toUnicode, differences, isCustomGlyph, isMono };
    fontCache.set(fObjNum, entry);
    fontMap.set(alias, entry);
  }
  return fontMap;
}

function resolvePageXObjectMap(resText, objects) {
  const xObjMap = new Map();
  for (const inlineM of resText.matchAll(/\/XObject\s*<<([\s\S]*?)>>/g)) {
    for (const xm of inlineM[1].matchAll(/\/([A-Za-z0-9_+.-]+)\s+(\d+)\s+\d+\s+R/g)) {
      xObjMap.set(xm[1], Number(xm[2]));
    }
  }
  for (const refM of resText.matchAll(/\/XObject\s+(\d+)\s+\d+\s+R/g)) {
    const xDictObj = objects.get(Number(refM[1]));
    if (xDictObj) {
      for (const xm of xDictObj.dictRaw.matchAll(/\/([A-Za-z0-9_+.-]+)\s+(\d+)\s+\d+\s+R/g)) {
        xObjMap.set(xm[1], Number(xm[2]));
      }
    }
  }
  return xObjMap;
}

function extractOwnResourcesText(dictRaw, objects) {
  let out = dictRaw || "";
  for (const resRef of out.matchAll(/\/Resources\s+(\d+)\s+\d+\s+R/g)) {
    if (objects.has(Number(resRef[1]))) {
      out += `\n${objects.get(Number(resRef[1])).dictRaw}`;
    }
  }
  return out;
}

function parsePdfContentStream(
  streamText,
  fontMap = new Map(),
  { xObjectMap = new Map(), objects = new Map(), fontCache = new Map(), visitedForms = new Set(), depth = 0 } = {},
) {
  const cleaned = stripInlineImagesLinear(streamText);
  const textParts = [];
  const nonMonoParts = [];

  let i = 0;
  let currentLine = "";
  let currentNonMonoLine = "";
  let activeFont = null;
  let lastName = null;
  let curY = null;
  let curX = null;
  let tm = [1, 0, 0, 1, 0, 0];
  let noArrayClose = false;
  const numStack = [];
  const mcStack = [];
  let actualTextDepth = 0;

  const flushLine = () => {
    const t = currentLine.trim();
    if (t) textParts.push(t);
    const nm = currentNonMonoLine.trim();
    if (nm) nonMonoParts.push(nm);
    currentLine = "";
    currentNonMonoLine = "";
  };

  const emitChunk = (str) => {
    if (!str) return;
    currentLine += str;
    if (!activeFont?.isMono) {
      currentNonMonoLine += str;
    }
  };

  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (isPdfWs(ch)) {
      i += 1;
      continue;
    }
    if (ch === "%") {
      const nl = cleaned.indexOf("\n", i);
      i = nl === -1 ? cleaned.length : nl + 1;
      continue;
    }
    if (ch === "(") {
      const { raw, endIdx } = readPdfLiteralAt(cleaned, i);
      const { op, endIdx: afterOp } = readPdfOpAt(cleaned, endIdx);
      if (op === "Tj" || op === "'" || op === '"') {
        if (actualTextDepth === 0) {
          if (op === "'" || op === '"') flushLine();
          emitChunk(decodePdfLiteralWithFont(raw, activeFont));
        }
        i = afterOp;
        numStack.length = 0;
        continue;
      }
      i = endIdx;
      continue;
    }
    if (ch === "<" && cleaned[i + 1] === "<") {
      const { raw: dictRaw, endIdx } = readPdfDictAt(cleaned, i);
      const { op, endIdx: afterOp } = readPdfOpAt(cleaned, endIdx);
      if (op === "BDC") {
        const actual = extractActualTextFromPropDict(dictRaw);
        if (actual !== null) {
          if (mcStack.length > 0) mcStack[mcStack.length - 1].hasChildActual = true;
          mcStack.push({ actualText: actual, hasChildActual: false });
          actualTextDepth += 1;
        } else {
          mcStack.push({ actualText: null, hasChildActual: false });
        }
        i = afterOp;
        numStack.length = 0;
        continue;
      }
      i = endIdx;
      continue;
    }
    if (ch === "<" && cleaned[i + 1] !== "<") {
      const closeIdx = cleaned.indexOf(">", i + 1);
      if (closeIdx !== -1) {
        const { op, endIdx: afterOp } = readPdfOpAt(cleaned, closeIdx + 1);
        if (op === "Tj" || op === "'" || op === '"') {
          if (actualTextDepth === 0) {
            if (op === "'" || op === '"') flushLine();
            emitChunk(decodePdfHexWithFont(cleaned.slice(i + 1, closeIdx), activeFont));
          }
          i = afterOp;
          numStack.length = 0;
          continue;
        }
        i = closeIdx + 1;
        continue;
      }
    }
    if (ch === "[") {
      if (noArrayClose) {
        i += 1;
        continue;
      }
      let j = i + 1;
      let seg = "";
      let valid = false;
      let pendingSpace = false;
      let sawNum = false;
      let curNumStr = "";
      const flushKernNum = () => {
        if (curNumStr) {
          const kv = Number(curNumStr);
          if (Number.isFinite(kv) && kv <= -200 && seg.length > 0 && !/\s$/.test(seg)) {
            pendingSpace = true;
          }
          curNumStr = "";
        }
        sawNum = false;
      };
      while (j < cleaned.length) {
        const cj = cleaned[j];
        if (cj === "(") {
          flushKernNum();
          const lit = readPdfLiteralAt(cleaned, j);
          if (actualTextDepth === 0) {
            const dec = decodePdfLiteralWithFont(lit.raw, activeFont);
            if (dec) {
              if (pendingSpace && !/^\s/.test(dec)) seg += " ";
              pendingSpace = false;
              seg += dec;
            }
          }
          j = lit.endIdx;
          continue;
        }
        if (cj === "<" && cleaned[j + 1] !== "<") {
          flushKernNum();
          const c2 = cleaned.indexOf(">", j + 1);
          if (c2 !== -1) {
            if (actualTextDepth === 0) {
              const dec = decodePdfHexWithFont(cleaned.slice(j + 1, c2), activeFont);
              if (dec) {
                if (pendingSpace && !/^\s/.test(dec)) seg += " ";
                pendingSpace = false;
                seg += dec;
              }
            }
            j = c2 + 1;
            continue;
          }
        }
        if (cj === "]") {
          flushKernNum();
          const { op, endIdx: afterOp } = readPdfOpAt(cleaned, j + 1);
          if (op === "TJ") {
            valid = true;
            j = afterOp;
          } else {
            j += 1;
          }
          break;
        }
        if (cj === "[" || j - i > 262144) break;
        if ((cj >= "0" && cj <= "9") || cj === "-" || cj === "+" || cj === ".") {
          curNumStr += cj;
          sawNum = true;
        } else if (sawNum) {
          flushKernNum();
        }
        j += 1;
      }
      if (j >= cleaned.length && !valid) noArrayClose = true;
      if (valid) {
        if (actualTextDepth === 0) emitChunk(seg);
        i = j;
        numStack.length = 0;
        continue;
      }
    }
    if (ch === "/") {
      let j = i + 1;
      while (j < cleaned.length && !isPdfDelimiter(cleaned[j])) j += 1;
      lastName = cleaned.slice(i + 1, j);
      i = j;
      continue;
    }
    let endTok = i;
    while (endTok < cleaned.length && !isPdfDelimiter(cleaned[endTok])) endTok += 1;
    const tok = cleaned.slice(i, endTok);
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(tok)) {
      numStack.push(Number(tok));
      if (numStack.length > 8) numStack.shift();
    } else {
      if (tok === "Tf") {
        activeFont = (lastName && fontMap.get(lastName)) || null;
      } else if (tok === "BT") {
        tm = [1, 0, 0, 1, 0, 0];
      } else if (tok === "T*") {
        flushLine();
      } else if (tok === "Td" || tok === "TD") {
        const tx = numStack.length >= 2 ? numStack[numStack.length - 2] : 0;
        const ty = numStack.length >= 2 ? numStack[numStack.length - 1] : 0;
        tm[4] += tx;
        tm[5] += ty;
        if (curY !== null && Math.abs(ty) > 2.0) {
          flushLine();
        } else if (
          tx > 4 &&
          currentLine.length > 0 &&
          !/\s$/.test(currentLine) &&
          curX !== null &&
          tm[4] > curX + 4
        ) {
          emitChunk(" ");
        }
        curX = tm[4];
        curY = tm[5];
      } else if (tok === "Tm") {
        if (numStack.length >= 6) {
          const vals = numStack.slice(-6);
          const nx = vals[4];
          const ny = vals[5];
          if (curY !== null && Math.abs(ny - curY) > 2.0) {
            flushLine();
          } else if (curX !== null && nx > curX + 4 && currentLine.length > 0 && !/\s$/.test(currentLine)) {
            emitChunk(" ");
          }
          curX = nx;
          curY = ny;
          tm = vals;
        }
      } else if (tok === "Do") {
        if (lastName && depth < 8 && xObjectMap.has(lastName)) {
          const xObjNum = xObjectMap.get(lastName);
          if (!visitedForms.has(xObjNum)) {
            const formObj = objects.get(xObjNum);
            if (formObj && /\/Subtype\s*\/Form\b/.test(formObj.dictRaw || "")) {
              flushLine();
              const formStream = decodeObjectStream(formObj);
              if (formStream) {
                const formResText = extractOwnResourcesText(formObj.dictRaw, objects);
                const ownFonts = resolvePageFontMap(formResText, objects, fontCache);
                const mergedFonts = new Map([...fontMap, ...ownFonts]);
                const ownXObjs = resolvePageXObjectMap(formResText, objects);
                const mergedXObjs = new Map([...xObjectMap, ...ownXObjs]);
                const nextVisited = new Set(visitedForms);
                nextVisited.add(xObjNum);
                const nested = parsePdfContentStream(formStream, mergedFonts, {
                  xObjectMap: mergedXObjs,
                  objects,
                  fontCache,
                  visitedForms: nextVisited,
                  depth: depth + 1,
                });
                if (nested.text) textParts.push(nested.text);
                if (nested.nonMonoText) nonMonoParts.push(nested.nonMonoText);
              }
            }
          }
        }
        lastName = null;
      } else if (tok === "BMC" || tok === "BDC") {
        mcStack.push({ actualText: null, hasChildActual: false });
      } else if (tok === "EMC") {
        const frame = mcStack.pop();
        if (frame && frame.actualText !== null) {
          actualTextDepth = Math.max(0, actualTextDepth - 1);
          if (!frame.hasChildActual && actualTextDepth === 0) {
            emitChunk(frame.actualText);
          }
        }
      }
      numStack.length = 0;
    }
    i = endTok === i ? i + 1 : endTok;
  }
  flushLine();

  return {
    text: textParts.join("\n"),
    nonMonoText: nonMonoParts.join("\n"),
  };
}

/**
 * Extract page count, geometry, and decoded text spans from PDF buffers without external dependencies.
 * Supports FlateDecode streams, PDF 1.5+ /ObjStm, /ToUnicode CMaps, UTF-16BE, TJ arrays, and /ActualText.
 */
export function inspectPdfBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) {
    throw new Error("Invalid or truncated PDF buffer");
  }
  const head = buffer.subarray(0, Math.min(1024, buffer.length)).toString("latin1");
  if (!head.includes("%PDF-")) {
    throw new Error("Invalid PDF header");
  }

  const { latin, objects } = extractPdfObjects(buffer);
  const trailerMatch = latin.match(/trailer\s*<<[\s\S]*?>>/);
  if (trailerMatch && /\/Encrypt\b/.test(trailerMatch[0])) {
    return { encrypted: true, pageCount: 0, pages: [], extractedText: "" };
  }
  for (const obj of objects.values()) {
    if (!obj.streamBytes && /\/Encrypt\b/.test(obj.dictRaw)) {
      return { encrypted: true, pageCount: 0, pages: [], extractedText: "" };
    }
  }

  function extractOwnRes(dictRaw) {
    return extractOwnResourcesText(dictRaw, objects);
  }

  const orderedPageObjs = [];
  const inheritedMediaBox = new Map();
  const inheritedResources = new Map();
  const visitedTree = new Set();

  function walkPagesTreeIterative(rootNum) {
    const work = [{ objNum: rootNum, parentBox: null, parentRes: "" }];
    while (work.length > 0) {
      const { objNum, parentBox, parentRes } = work.pop();
      if (visitedTree.has(objNum)) continue;
      visitedTree.add(objNum);
      const obj = objects.get(objNum);
      if (!obj) continue;
      const ownBox = parseMediaBoxRect(obj.dictRaw) || parentBox;
      const hasOwnRes = /\/Resources(?:\s|\n|<<)/.test(obj.dictRaw);
      const combinedRes = hasOwnRes ? `${parentRes}\n${extractOwnRes(obj.dictRaw)}` : parentRes;
      if (/\/Type\s*\/Pages\b/.test(obj.dictRaw)) {
        const kidsMatch = obj.dictRaw.match(/\/Kids\s*\[([^\]]*)\]/);
        if (kidsMatch) {
          const kids = [...kidsMatch[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((rm) => Number(rm[1]));
          for (let k = kids.length - 1; k >= 0; k -= 1) {
            work.push({ objNum: kids[k], parentBox: ownBox, parentRes: combinedRes });
          }
        }
        continue;
      }
      if (/\/Type\s*\/Page(?![a-zA-Z])/.test(obj.dictRaw)) {
        inheritedMediaBox.set(objNum, ownBox || [612, 792]);
        inheritedResources.set(objNum, combinedRes || extractOwnRes(obj.dictRaw));
        orderedPageObjs.push(obj);
      }
    }
  }

  const catalogObj = Array.from(objects.values()).find((o) => /\/Type\s*\/Catalog\b/.test(o.dictRaw));
  if (catalogObj) {
    const pagesRef = catalogObj.dictRaw.match(/\/Pages\s+(\d+)\s+\d+\s+R/);
    if (pagesRef) walkPagesTreeIterative(Number(pagesRef[1]));
  }
  if (orderedPageObjs.length === 0) {
    for (const obj of Array.from(objects.values()).sort((a, b) => a.objNum - b.objNum)) {
      if (/\/Type\s*\/Page(?![a-zA-Z])/.test(obj.dictRaw)) {
        inheritedMediaBox.set(obj.objNum, parseMediaBoxRect(obj.dictRaw) || [612, 792]);
        inheritedResources.set(obj.objNum, extractOwnRes(obj.dictRaw));
        orderedPageObjs.push(obj);
      }
    }
  }

function extractPdfUriValuesFromText(rawText, pageIndex, seen, out) {
  if (!rawText || !rawText.includes("/URI")) return;
  const pushUrl = (url) => {
    const clean = String(url || "").trim();
    if (!clean) return;
    const key = `${pageIndex}:${clean}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      url: clean,
      raw: clean,
      line: pageIndex,
      segmentId: null,
      locator: { kind: "pdf-readonly", page: pageIndex },
    });
  };

  // Balanced nested parenthesis scan for `/URI (...)`
  const keyRe = /\/URI\s*\(/g;
  let km;
  while ((km = keyRe.exec(rawText)) !== null) {
    let i = km.index + km[0].length;
    let depth = 1;
    let rawLit = "";
    while (i < rawText.length && depth > 0) {
      const ch = rawText[i];
      if (ch === "\\") {
        rawLit += ch + (rawText[i + 1] ?? "");
        i += 2;
        continue;
      }
      if (ch === "(") {
        depth += 1;
        rawLit += ch;
      } else if (ch === ")") {
        depth -= 1;
        if (depth > 0) rawLit += ch;
      } else {
        rawLit += ch;
      }
      i += 1;
    }
    if (depth === 0) {
      pushUrl(decodePdfUnicodeLiteral(rawLit));
    }
  }

  const hexRe = /\/URI\s*<([0-9A-Fa-f\s]+)>/g;
  let m;
  while ((m = hexRe.exec(rawText)) !== null) {
    pushUrl(decodePdfHexString(m[1]));
  }
}

  const fontCache = new Map();
  const pdfLinks = [];
  const seenLinks = new Set();
  const visitedUriObjNums = new Set();

  const pages = orderedPageObjs.map((pageObj, idx) => {
    const [width, height] = inheritedMediaBox.get(pageObj.objNum) || [612, 792];
    const resText = inheritedResources.get(pageObj.objNum) || extractOwnRes(pageObj.dictRaw);
    const fontMap = resolvePageFontMap(resText, objects, fontCache);
    const xObjectMap = resolvePageXObjectMap(resText, objects);

    const annotRefs = [];
    const annotsArr = pageObj.dictRaw.match(/\/Annots\s*\[([^\]]*)\]/);
    if (annotsArr) {
      for (const rm of annotsArr[1].matchAll(/(\d+)\s+\d+\s+R/g)) annotRefs.push(Number(rm[1]));
    } else {
      const annotsSingle = pageObj.dictRaw.match(/\/Annots\s+(\d+)\s+\d+\s+R/);
      if (annotsSingle) annotRefs.push(Number(annotsSingle[1]));
    }
    for (const aNum of annotRefs) {
      visitedUriObjNums.add(aNum);
      const aObj = objects.get(aNum);
      if (!aObj) continue;
      extractPdfUriValuesFromText(aObj.dictRaw, idx + 1, seenLinks, pdfLinks);
      const actRef = aObj.dictRaw.match(/\/A\s+(\d+)\s+\d+\s+R/);
      if (actRef) {
        const actNum = Number(actRef[1]);
        visitedUriObjNums.add(actNum);
        const actObj = objects.get(actNum);
        if (actObj) extractPdfUriValuesFromText(actObj.dictRaw, idx + 1, seenLinks, pdfLinks);
      }
    }

    const contentRefs = [];
    const arrMatch = pageObj.dictRaw.match(/\/Contents\s*\[([^\]]*)\]/);
    if (arrMatch) {
      for (const rm of arrMatch[1].matchAll(/(\d+)\s+\d+\s+R/g)) contentRefs.push(Number(rm[1]));
    } else {
      const singleMatch = pageObj.dictRaw.match(/\/Contents\s+(\d+)\s+\d+\s+R/);
      if (singleMatch) contentRefs.push(Number(singleMatch[1]));
    }

    const joinedStream = contentRefs.map((id) => decodeObjectStream(objects.get(id))).join("\n");
    const parsed = parsePdfContentStream(joinedStream, fontMap, {
      xObjectMap,
      objects,
      fontCache,
      visitedForms: new Set(),
      depth: 0,
    });
    const wordCount = parsed.text.trim() ? parsed.text.trim().split(/\s+/).length : 0;
    const cjkCount = (parsed.text.match(/[\u4e00-\u9fff]/g) || []).length;

    return {
      index: idx + 1,
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
      text: parsed.text,
      nonMonoText: parsed.nonMonoText,
      wordCount,
      cjkCount,
    };
  });

  for (const obj of objects.values()) {
    if (visitedUriObjNums.has(obj.objNum)) continue;
    extractPdfUriValuesFromText(obj.dictRaw, 1, seenLinks, pdfLinks);
  }

  const fallbackPageCount = pages.length || (latin.match(/\/Type\s*\/Page\b/g) || []).length || 1;
  return {
    encrypted: false,
    pageCount: fallbackPageCount,
    pages,
    links: pdfLinks,
    extractedText: pages.map((p) => p.text).filter(Boolean).join("\n\n"),
  };
}
