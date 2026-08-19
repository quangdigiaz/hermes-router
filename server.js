#!/usr/bin/env node
// Default HermesRouter production port to 3003 when PORT env is not set.
// The standalone Next.js server otherwise falls back to 3000.
// Use PORT=20127 for `pnpm dev` (development server).
process.env.PORT ||= '3003';
require('./.next/standalone/server.js');
