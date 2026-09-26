// icons/icon.svg から、ホーム画面用のPNG（180・192・512px）を作る。
// 使い方: node tools/make-icons.mjs   （playwright は playtest ツールのものを借りる）
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(path.join(os.homedir(), '.claude/tools/playtest/package.json'));
const { chromium } = require('playwright');
const iconsDir = fileURLToPath(new URL('../icons/', import.meta.url));
const svg = fs.readFileSync(path.join(iconsDir, 'icon.svg'), 'utf8');

const browser = await chromium.launch();
for (const size of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: path.join(iconsDir, `icon-${size}.png`) });
  await page.close();
}
await browser.close();
console.log('icons: 180, 192, 512 を作りました');
