import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, mkdir, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const script = new URL('../scripts/sync-tail.mjs', import.meta.url);
test('sync publishes public content, preserves tags, and removes stale generated pages', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'tail-sync-test-'));
  const cwd = process.cwd();
  const originalFetch = globalThis.fetch;
  const files = ['2026-09-16-inline.md', '2026-09-17-block.md'];
  try {
    process.chdir(directory);
    await mkdir('src/pages/learned', { recursive: true });
    await writeFile('src/pages/learned/.tail-sync-manifest.json', '["stale.mdx"]');
    await writeFile('src/pages/learned/stale.mdx', 'old');
    await writeFile('src/pages/learned/manual.astro', 'keep');
    globalThis.fetch = async (url) => {
      if (url.includes('api.github.com')) return Response.json(files.map((name) => ({
        type: 'file', name, download_url: `https://example.com/${name}`, html_url: `https://github.com/bengoshow/tail/blob/main/tail/${name}`,
      })));
      const block = url.endsWith('block.md');
      return new Response(`---\ndate: 2026-09-16\ntitle: Example: a lesson\ntags: ${block ? '\n  - cursor\n  - skills\n  - proof' : '[hubspot, images]'}\n---\n\n# A lesson\n\n## Problem\n\nA [linked](https://example.com) **problem**.\n\n## Result\n\nPublic result.\n\n### Social draft${block ? ' (optional)' : ''}\n\nPRIVATE_DRAFT\n`);
    };
    await import(script.href);
    for (const [index, slug] of ['inline', 'block'].entries()) {
      const page = await readFile(`src/pages/learned/${slug}.mdx`, 'utf8');
      assert.match(page, /title: "Example: a lesson"/);
      assert.match(page, /description: "A linked problem\."/);
      assert.ok(page.includes(index ? 'tags: ["cursor","skills","proof"]' : 'tags: ["hubspot","images"]'));
      assert.ok(page.includes(files[index]));
      assert.ok(!page.includes('PRIVATE_DRAFT'));
      assert.ok(!page.includes('Social draft'));
    }
    await assert.rejects(access('src/pages/learned/stale.mdx'));
    await access('src/pages/learned/manual.astro');
  } finally {
    globalThis.fetch = originalFetch;
    process.chdir(cwd);
    await rm(directory, { recursive: true, force: true });
  }
});
