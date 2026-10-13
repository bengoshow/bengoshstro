import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tailLoader } from '../src/loaders/tail-loader.mjs';

test('loader preserves tags, strips draft variants, renders Markdown and refreshes the collection', async () => {
  const originalFetch = globalThis.fetch;
  const files = ['2026-09-16-inline.md', '2026-09-17-block.md'];
  const entries = new Map([['stale', {}]]);
  try {
    globalThis.fetch = async (url) => {
      if (url.includes('api.github.com')) return Response.json(files.map((name) => ({
        type: 'file', name, download_url: `https://example.com/${name}`, html_url: `https://github.com/bengoshow/tail/blob/main/tail/${name}`,
      })));
      const block = url.endsWith('block.md');
      return new Response(`---\ndate: 2026-09-16\ntitle: Example: a lesson\ntags: ${block ? '\n  - cursor\n  - skills\n  - proof' : '[hubspot, images]'}\n---\n\n# A lesson\n\n## Problem\n\nA [linked](https://example.com) **problem**.\n\n## Result\n\nPublic result.\n\n### Social draft${block ? ' (optional)' : ''}\n\nPRIVATE_DRAFT\n`);
    };
    await tailLoader().load({
      store: { clear: () => entries.clear(), set: (entry) => entries.set(entry.id, entry) },
      parseData: async ({ data }) => data,
      renderMarkdown: async (content) => ({ html: content }),
    });
    assert.equal(entries.size, 2);
    assert.ok(!entries.has('stale'));
    assert.deepEqual(entries.get('inline').data.tags, ['hubspot', 'images']);
    assert.deepEqual(entries.get('block').data.tags, ['cursor', 'skills', 'proof']);
    for (const [index, slug] of ['inline', 'block'].entries()) {
      const entry = entries.get(slug);
      assert.equal(entry.data.title, 'Example: a lesson');
      assert.equal(entry.data.description, 'A linked problem.');
      assert.ok(entry.data.sourceUrl.endsWith(files[index]));
      assert.ok(!entry.rendered.html.includes('PRIVATE_DRAFT'));
      assert.ok(!entry.rendered.html.includes('Social draft'));
    }
    globalThis.fetch = async () => new Response('unavailable', { status: 503 });
    await assert.rejects(tailLoader().load({ store: { clear: () => entries.clear() } }), /503/);
    assert.equal(entries.size, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
