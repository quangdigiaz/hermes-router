#!/usr/bin/env node
// Cross-platform production start for the Hermes Router app.
//
// Why this wrapper exists:
//   The Next.js standalone server binds to HOSTNAME (default 0.0.0.0 = all
//   interfaces) and prints "- Network: http://0.0.0.0:PORT" literally, because
//   its banner logic keeps the bound host as-is when HOSTNAME is set
//   (start-server.js: `hostname ?? getNetworkHost()`). We still WANT to bind
//   0.0.0.0 (so localhost + LAN both work), but the banner should show the
//   actual LAN/Wi-Fi IP so it's copy-pasteable from another device.
//
//   This wrapper resolves the real LAN IPv4 at runtime and rewrites only the
//   "Network:" banner line (0.0.0.0 -> real IP) before handing off to the
//   generated standalone server. It lives in scripts/ so it survives every
//   `npm run build` (which regenerates .next/standalone/server.js).

const fs = require("fs");
const os = require("os");
const path = require("path");

const appDir = path.resolve(__dirname, "..");
const serverPath = path.join(appDir, ".next", "standalone", "server.js");

// Guard: same friendly hint as before if the app wasn't built yet.
if (!fs.existsSync(serverPath)) {
  console.error("[start] .next/standalone belum ada. Jalankan: npm run build");
  process.exit(1);
}

// Resolve the real LAN IPv4. Prefer physical NICs (wlan/eth) over virtual
// bridges (docker, waydroid, veth, virbr, vmnet, tun/tap).
function resolveLanIPv4() {
  const ifaces = os.networkInterfaces();
  const isVirtual = /^(docker|br-|veth|waydroid|virbr|vmnet|vboxnet|tun|tap|utun|llw|awdl)/i;
  const candidates = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const a of addrs || []) {
      if (a.family === "IPv4" && !a.internal && a.address) {
        candidates.push({ address: a.address, virtual: isVirtual.test(name) });
      }
    }
  }
  candidates.sort((a, b) => Number(a.virtual) - Number(b.virtual));
  return candidates.length ? candidates[0].address : null;
}

const lanIp = resolveLanIPv4();

// Rewrite the Next.js "- Network: ...0.0.0.0..." banner line to the real IP.
// We only touch lines that mention both "Network:" and "0.0.0.0" so nothing
// else in the output is affected.
if (lanIp) {
  const origWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, encoding, cb) => {
    try {
      let text = typeof chunk === "string" ? chunk : Buffer.isBuffer(chunk) ? chunk.toString("utf8") : null;
      if (text !== null && text.includes("Network:") && text.includes("0.0.0.0")) {
        text = text.replace(/0\.0\.0\.0/g, lanIp);
        return origWrite(text, encoding, cb);
      }
    } catch {
      /* fall through to original write */
    }
    return origWrite(chunk, encoding, cb);
  };
}

// Hand off to the generated standalone server (self-contained; it chdir()s and
// reads PORT/HOSTNAME from env itself).
require(serverPath);
