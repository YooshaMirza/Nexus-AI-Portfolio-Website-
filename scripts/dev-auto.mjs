/**
 * Local testing only: `npm run dev:auto`
 * Starts the Vite dev server and opens a separate Chrome window where the site may
 * play sound and use the mic without a tap, so Nexus starts talking on every reload.
 * Uses its own Chrome profile (.chrome-dev/, git-ignored) so your normal Chrome is untouched.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const url = process.argv[2] || 'http://localhost:5173/';
const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));

const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(url); return true; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  return false;
}

if (!browser) {
  console.warn('[dev:auto] Chrome not found. Set CHROME_PATH, or open the site yourself and tap once.');
} else if (await waitForServer()) {
  spawn(browser, [
    `--user-data-dir=${resolve('.chrome-dev')}`,
    '--autoplay-policy=no-user-gesture-required', // sound without a tap
    '--use-fake-ui-for-media-stream',             // auto-accept the mic prompt (still your real mic)
    '--no-first-run', '--no-default-browser-check',
    url,
  ], { stdio: 'ignore', detached: true }).unref();
  console.log(`[dev:auto] opened ${url} in a test Chrome window. Nexus starts on load there.`);
}

const stop = () => { vite.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
