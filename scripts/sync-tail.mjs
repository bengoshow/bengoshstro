import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const apiUrl = 'https://api.github.com/repos/bengoshow/tail/contents/tail?ref=main';
const outputDir = path.resolve('src/pages/learned');
const manifestPath = path.join(outputDir, '.tail-sync-manifest.json');

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'bengoshstro-tail-sync' },
  });
  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status}) for ${url}`);
  }
  return response.json();
}

function frontmatterValue(source, key) {
  const match = source.match(new RegExp(`^\\s*${key}:\\s*(.*)$`, 'm'));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
}

function parseTags(source) {
  const value = frontmatterValue(source, 'tags');
  if (!value.startsWith('[') || !value.endsWith(']')) return [];
  return value.slice(1, -1).split(',').map((tag) => tag.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

function slugFromFilename(filename) {
  return filename.replace(/^\\d{4}-\\d{2}-\\d{2}-/, '').replace(/\\.md$/, '');
}

function descriptionFrom(body) {
  const problem = body.match(/^## Problem\\s*\\n+([\\s\\S]*?)(?=\\n## |\\n### Social draft|$)/m)?.[1] ?? '';
  const paragraph = problem.trim().split(/\\n\\s*\\n/)[0] ?? '';
  const plain = paragraph.replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, '$1').replace(/[*_`#>]/g, '').replace(/\\s+/g, ' ').trim();
  if (!plain) return 'A Today AI Learned engineering case study.';
  return plain.length > 220 ? `${plain.slice(0, 217).trimEnd()}…` : plain;
}

function createPage(source, filename, rawUrl) {
  const [, frontmatter, article = ''] = source.match(/^---\\s*\\n([\\s\\S]*?)\\n---\\s*\\n?([\\s\\S]*)$/) ?? [];
  if (!frontmatter || !article) throw new Error(`Could not parse Tail frontmatter in ${filename}`);

  const date = frontmatterValue(frontmatter, 'date');
  const title = frontmatterValue(frontmatter, 'title');
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date) || !title) {
    throw new Error(`Missing or invalid date/title in ${filename}`);
  }

  // Social drafts are useful in the source repo but aren't part of the website article.
  const publicArticle = article.split(/^### Social draft\\s*$/m)[0].trim();
  const tags = parseTags(frontmatter);
  const metadata = [
    `title: ${JSON.stringify(title)}`,
    `pubDate: ${date}`,
    `description: ${JSON.stringify(descriptionFrom(publicArticle))}`,
    `author: "Ben Goshow"`,
    `tags: ${JSON.stringify(tags)}`,
    `layout: "../../layouts/MarkdownLayout.astro"`,
  ].join('\\n');

  return `---\\n${metadata}\\n---\\n\\n${publicArticle}\\n\\n---\\n\\n<p><small>Published in <a href="https://github.com/bengoshow/tail">Today AI Learned</a>. <a href="${rawUrl}">View the original entry on GitHub</a>.</small></p>\\n`;
}

await mkdir(outputDir, { recursive: true });
let previousFiles = [];
try {
  previousFiles = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const files = (await getJson(apiUrl))
  .filter((item) => item.type === 'file' && item.name.endsWith('.md'))
  .sort((a, b) => a.name.localeCompare(b.name));

const generatedFiles = [];
for (const file of files) {
  const response = await fetch(file.download_url);
  if (!response.ok) throw new Error(`Could not download ${file.name} (${response.status})`);
  const source = await response.text();
  const slug = slugFromFilename(file.name);
  const outputName = `${slug}.mdx`;
  await writeFile(path.join(outputDir, outputName), createPage(source, file.name, file.html_url));
  generatedFiles.push(outputName);
}

for (const oldFile of previousFiles) {
  if (!generatedFiles.includes(oldFile) && path.basename(oldFile) === oldFile && oldFile.endsWith('.mdx')) {
    await rm(path.join(outputDir, oldFile), { force: true });
  }
}

await writeFile(manifestPath, `${JSON.stringify(generatedFiles, null, 2)}\\n`);
console.log(`Synced ${generatedFiles.length} Tail posts into /learned.`);
