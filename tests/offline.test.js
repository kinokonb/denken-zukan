// オフラインで開けるかの前提：画面が読むファイルが全部 sw.js の保存一覧（ASSETS）に入っていて、実在すること。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function cachedAssets() {
  const source = read('sw.js');
  const list = source.match(/const ASSETS = \[([\s\S]*?)\];/);
  assert.ok(list, 'sw.js に ASSETS がない');
  return [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function filesUnder(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.posix.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(rel) : [rel];
  });
}

test('保存一覧のファイルはすべて実在する', () => {
  for (const asset of cachedAssets()) {
    if (asset === './') continue;
    assert.ok(fs.existsSync(path.join(root, asset)), `${asset} がない`);
  }
});

test('配信するファイル（js・icons・画面の入口）はすべて保存一覧にある', () => {
  const assets = new Set(cachedAssets());
  const served = ['index.html', 'style.css', 'manifest.webmanifest', ...filesUnder('js'), ...filesUnder('icons')];
  for (const file of served) assert.ok(assets.has(file), `${file} が sw.js の ASSETS にない`);
});

test('index.html と manifest が参照するファイルは実在し、保存一覧にある', () => {
  const assets = new Set(cachedAssets());
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
  const manifest = JSON.parse(read('manifest.webmanifest'));
  refs.push(...manifest.icons.map((icon) => icon.src));
  assert.ok(refs.length > 10);
  for (const ref of refs) {
    assert.ok(fs.existsSync(path.join(root, ref)), `${ref} がない`);
    assert.ok(assets.has(ref), `${ref} が sw.js の ASSETS にない`);
  }
});
