const tailDirectoryUrl = 'https://api.github.com/repos/bengoshow/tail/contents/tail?ref=main';

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'bengoshstro-content-loader',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

function readFrontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  const value = match?.[1]?.trim();
  if (!value) return '';
  if (value.startsWith('"')) return JSON.parse(value);
  return value.replace(/^'|'$/g, '');
}

function readTags(frontmatter) {
  const value = readFrontmatterValue(frontmatter, 'tags');
  if (!value.startsWith('[') || !value.endsWith(']')) return [];

  return value.slice(1, -1)
    .split(',')
    .map((tag) => tag.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function extractDescription(body) {
  const problem = body.match(/^## Problem\s*\n+([\s\S]*?)(?=\n## |\n### Social draft|$)/m)?.[1] ?? '';
  const firstParagraph = problem.trim().split(/\n\s*\n/)[0] ?? '';
  const plainText = firstParagraph
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plainText) return 'A Today AI Learned engineering case study.';
  return plainText.length > 220 ? `${plainText.slice(0, 217).trimEnd()}…` : plainText;
}

function parseTailPost(source, filename, sourceUrl) {
  const [, frontmatter, article = ''] = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/) ?? [];
  if (!frontmatter || !article) {
    throw new Error(`Could not parse Tail frontmatter in ${filename}`);
  }

  const date = readFrontmatterValue(frontmatter, 'date');
  const title = readFrontmatterValue(frontmatter, 'title');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title) {
    throw new Error(`Missing or invalid date/title in ${filename}`);
  }

  const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  const content = article.split(/^### Social draft\b.*$/m)[0].trim();

  return {
    id: slug,
    data: {
      date,
      description: extractDescription(content),
      sourceUrl,
      tags: readTags(frontmatter),
      title,
    },
    content,
  };
}

export function tailLoader() {
  return {
    name: 'tail-github-loader',
    async load({ store, parseData, renderMarkdown }) {
      const files = (await fetchJson(tailDirectoryUrl))
        .filter((file) => file.type === 'file' && file.name.endsWith('.md'))
        .sort((a, b) => a.name.localeCompare(b.name));

      const posts = await Promise.all(files.map(async (file) => {
        const response = await fetch(file.download_url);
        if (!response.ok) {
          throw new Error(`Could not download ${file.name} (${response.status})`);
        }
        return parseTailPost(await response.text(), file.name, file.html_url);
      }));

      // Keep the existing collection available if GitHub is temporarily unreachable.
      store.clear();
      for (const post of posts) {
        const data = await parseData({ id: post.id, data: post.data });
        store.set({
          id: post.id,
          data,
          rendered: await renderMarkdown(post.content),
        });
      }
    },
  };
}
