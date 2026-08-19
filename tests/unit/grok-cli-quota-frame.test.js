import { describe, it, expect } from "vitest";
import {
  decodeGrokCreditsFrame,
  probeFrameHeader,
} from "../../open-sse/services/usage/grokCliQuotaFrame.js";

function encodeVarint(value) {
  const bytes = [];
  let v = BigInt(value);
  do {
    let byte = Number(v & 0x7fn);
    v >>= 7n;
    if (v !== 0n) byte |= 0x80;
    bytes.push(byte);
  } while (v !== 0n);
  return Buffer.from(bytes);
}

function encodeTag(fieldNumber, wireType) {
  return encodeVarint((fieldNumber << 3) | wireType);
}

function encodeFixed32Field(fieldNumber, value) {
  const body = Buffer.alloc(4);
  body.writeFloatLE(value, 0);
  return Buffer.concat([encodeTag(fieldNumber, 5), body]);
}

function encodeLengthDelimited(fieldNumber, body) {
  return Buffer.concat([encodeTag(fieldNumber, 2), encodeVarint(body.length), body]);
}

function encodeVarintField(fieldNumber, value) {
  return Buffer.concat([encodeTag(fieldNumber, 0), encodeVarint(value)]);
}

function encodeTimestampField(fieldNumber, seconds, nanos) {
  const parts = [];
  if (seconds !== 0) parts.push(encodeVarintField(1, seconds));
  if (nanos !== 0) parts.push(encodeVarintField(2, nanos));
  return encodeLengthDelimited(fieldNumber, Buffer.concat(parts));
}

function encodeCreditsInfo(shape) {
  const parts = [];
  if (shape.usageRatio !== undefined) parts.push(encodeFixed32Field(1, shape.usageRatio));
  if (shape.asOfSeconds !== undefined) {
    parts.push(encodeTimestampField(4, shape.asOfSeconds, shape.asOfNanos ?? 0));
  }
  if (shape.resetSeconds !== undefined) {
    parts.push(encodeTimestampField(5, shape.resetSeconds, shape.resetNanos ?? 0));
  }
  return Buffer.concat(parts);
}

function encodeTopLevelMessage(creditsInfo) {
  return encodeLengthDelimited(1, creditsInfo);
}

function frameData(payload) {
  const header = Buffer.alloc(5);
  header[0] = 0x00;
  header.writeUInt32BE(payload.length, 1);
  return Buffer.concat([header, payload]);
}

function frameTrailer(statusText = "grpc-status:0\r\n") {
  const body = Buffer.from(statusText, "utf8");
  const header = Buffer.alloc(5);
  header[0] = 0x80;
  header.writeUInt32BE(body.length, 1);
  return Buffer.concat([header, body]);
}

const REAL_RESET_SECONDS = 1784825940;
const REAL_RESET_NANOS = 867850000;

function isoFromEpoch(seconds, nanos) {
  return new Date(seconds * 1000 + Math.round(nanos / 1_000_000)).toISOString();
}

describe("decodeGrokCreditsFrame", () => {
  it("decodes real framed shape with reset timestamp", () => {
    const creditsInfo = encodeCreditsInfo({
      usageRatio: 1,
      asOfSeconds: 1784221140,
      asOfNanos: REAL_RESET_NANOS,
      resetSeconds: REAL_RESET_SECONDS,
      resetNanos: REAL_RESET_NANOS,
    });
    const buffer = Buffer.concat([frameData(encodeTopLevelMessage(creditsInfo)), frameTrailer()]);
    const result = decodeGrokCreditsFrame(buffer);
    expect(result).toBeTruthy();
    expect(result.percentUsed).toBe(100);
    expect(result.resetAt).toBe(isoFromEpoch(REAL_RESET_SECONDS, REAL_RESET_NANOS));
  });

  it("ignores trailing gRPC-web trailer frame", () => {
    const topMessage = encodeTopLevelMessage(encodeCreditsInfo({
      usageRatio: 0.5,
      resetSeconds: REAL_RESET_SECONDS,
    }));
    const result = decodeGrokCreditsFrame(Buffer.concat([frameData(topMessage), frameTrailer()]));
    expect(result.percentUsed).toBe(50);
  });

  it("decodes raw unframed protobuf payload", () => {
    const payload = encodeTopLevelMessage(encodeCreditsInfo({ usageRatio: 0.75 }));
    expect(probeFrameHeader(payload)).toBeNull();
    expect(decodeGrokCreditsFrame(payload).percentUsed).toBe(75);
  });

  it("treats omitted usage ratio as zero", () => {
    const payload = frameData(encodeTopLevelMessage(encodeCreditsInfo({
      resetSeconds: REAL_RESET_SECONDS,
      resetNanos: REAL_RESET_NANOS,
    })));
    expect(decodeGrokCreditsFrame(payload)).toMatchObject({
      percentUsed: 0,
      resetAt: isoFromEpoch(REAL_RESET_SECONDS, REAL_RESET_NANOS),
    });
  });

  it("clamps above 100% and rejects negative values", () => {
    expect(decodeGrokCreditsFrame(frameData(encodeTopLevelMessage(encodeCreditsInfo({ usageRatio: 1.5 })))).percentUsed).toBe(100);
    expect(
      decodeGrokCreditsFrame(
        frameData(encodeTopLevelMessage(encodeCreditsInfo({ usageRatio: -0.1 }))),
      ),
    ).toBeNull();
  });

  it("returns null for malformed payloads", () => {
    expect(decodeGrokCreditsFrame(Buffer.alloc(0))).toBeNull();
    expect(decodeGrokCreditsFrame(frameData(Buffer.from([0x0a, 0x02, 0x0d, 0x00])))).toBeNull();
    expect(decodeGrokCreditsFrame(frameTrailer())).toBeNull();
  });
});

describe("probeFrameHeader", () => {
  it("rejects invalid or truncated frames", () => {
    expect(probeFrameHeader(Buffer.from([7, 0, 0, 0, 0]))).toBeNull();
    const header = Buffer.from([0, 0, 0, 0, 9]);
    expect(probeFrameHeader(header)).toBeNull();
  });

  it("accepts trailer and non-zero offsets", () => {
    const trailer = frameTrailer();
    expect(probeFrameHeader(trailer).flag).toBe(0x80);
    const data = frameData(encodeTopLevelMessage(encodeCreditsInfo({ usageRatio: 0.5 })));
    const buffer = Buffer.concat([data, trailer]);
    const first = probeFrameHeader(buffer);
    expect(probeFrameHeader(buffer, first.payloadStart + first.payloadLength).flag).toBe(0x80);
  });
});
