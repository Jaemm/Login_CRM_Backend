import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { marked } from 'marked';
import { basename, extname, join, normalize, relative, resolve, sep } from 'path';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

type ResolvedDoc =
  | {
      kind: 'file';
      absolutePath: string;
      relativePath: string;
    }
  | {
      kind: 'directory';
      absolutePath: string;
      relativePath: string;
    };

@Injectable()
export class DocsService {
  private readonly docsRoot = resolve(process.cwd(), 'docs');

  async render(requestedPath = ''): Promise<{ title: string; html: string }> {
    const resolved = await this.resolveRequestedPath(requestedPath);

    if (!resolved) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
    }

    if (resolved.kind === 'directory') {
      return this.renderDirectory(resolved.absolutePath, resolved.relativePath);
    }

    return this.renderFile(resolved.absolutePath, resolved.relativePath);
  }

  private async resolveRequestedPath(requestedPath: string): Promise<ResolvedDoc | null> {
    const normalizedRoot = this.docsRoot.endsWith(sep) ? this.docsRoot : `${this.docsRoot}${sep}`;
    const cleanedPath = this.cleanPath(requestedPath);

    const candidatePaths = this.buildCandidatePaths(cleanedPath);

    for (const candidate of candidatePaths) {
      const absolutePath = resolve(this.docsRoot, candidate);

      if (absolutePath !== this.docsRoot && !absolutePath.startsWith(normalizedRoot)) {
        continue;
      }

      if (await this.pathExistsAsFile(absolutePath)) {
        return {
          kind: 'file',
          absolutePath,
          relativePath: relative(this.docsRoot, absolutePath),
        };
      }
    }

    for (const candidate of candidatePaths) {
      const absolutePath = resolve(this.docsRoot, candidate);

      if (absolutePath !== this.docsRoot && !absolutePath.startsWith(normalizedRoot)) {
        continue;
      }

      if (await this.pathExistsAsDirectory(absolutePath)) {
        return {
          kind: 'directory',
          absolutePath,
          relativePath: relative(this.docsRoot, absolutePath),
        };
      }
    }

    if (!cleanedPath) {
      const fallback = resolve(this.docsRoot, 'README.md');
      if (await this.pathExistsAsFile(fallback)) {
        return {
          kind: 'file',
          absolutePath: fallback,
          relativePath: relative(this.docsRoot, fallback),
        };
      }
    }

    return null;
  }

  private cleanPath(requestedPath: string): string {
    const decoded = decodeURIComponent(requestedPath || '')
      .replace(/\\/g, '/')
      .split('?')[0]
      .split('#')[0]
      .replace(/^\/+/, '');

    if (!decoded) {
      return '';
    }

    const normalized = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');

    if (normalized === '.' || normalized.startsWith('..')) {
      return '';
    }

    return normalized;
  }

  private buildCandidatePaths(cleanedPath: string): string[] {
    if (!cleanedPath) {
      return ['README.md'];
    }

    const candidates = new Set<string>();
    candidates.add(cleanedPath);

    if (!extname(cleanedPath)) {
      candidates.add(`${cleanedPath}.md`);
      candidates.add(join(cleanedPath, 'README.md'));
      candidates.add(join(cleanedPath, 'index.md'));
    }

    return [...candidates];
  }

  private async pathExistsAsFile(absolutePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(absolutePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  private async pathExistsAsDirectory(absolutePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(absolutePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async renderFile(absolutePath: string, relativePath: string): Promise<{ title: string; html: string }> {
    const content = await fs.readFile(absolutePath, 'utf8');
    const extension = extname(absolutePath).toLowerCase();
    const title = basename(absolutePath);

    const body =
      extension === '.md'
        ? await Promise.resolve(marked.parse(content, { gfm: true, breaks: true }))
        : `<pre class="plain">${this.escapeHtml(content)}</pre>`;

    return {
      title,
      html: this.wrapHtml({
        title,
        subtitle: relativePath,
        body,
      }),
    };
  }

  private async renderDirectory(
    absolutePath: string,
    relativePath: string,
  ): Promise<{ title: string; html: string }> {
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });

    const sortedEntries = entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) {
        return a.isDirectory() ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });

    const links = sortedEntries
      .map((entry) => {
        const childRelativePath = relativePath
          ? `${relativePath}/${entry.name}`
          : entry.name;
        const href = `/docs-md/${this.encodePath(childRelativePath)}${entry.isDirectory() ? '/' : ''}`;
        const label = entry.isDirectory() ? `${entry.name}/` : entry.name;
        return `<li><a href="${href}">${this.escapeHtml(label)}</a></li>`;
      })
      .join('');

    const body = `
      <div class="directory">
        <p class="muted">Directory listing for <code>${this.escapeHtml(
          relativePath || '.',
        )}</code></p>
        <ul>${links || '<li>No documents found.</li>'}</ul>
      </div>
    `;

    return {
      title: relativePath || 'docs',
      html: this.wrapHtml({
        title: relativePath || 'docs',
        subtitle: relativePath || 'docs',
        body,
      }),
    };
  }

  private wrapHtml(input: { title: string; subtitle: string; body: string }): string {
    const navLinks = [
      { label: 'Docs Home', href: '/docs-md/' },
      { label: 'Swagger', href: '/docs' },
    ]
      .map(
        (link) =>
          `<a href="${link.href}" class="nav-link">${this.escapeHtml(link.label)}</a>`,
      )
      .join('');

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${this.escapeHtml(input.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f4ef;
        --card: #ffffff;
        --text: #1f2328;
        --muted: #5f6b7a;
        --border: #d9d3c7;
        --link: #0a5bd3;
        --code-bg: #f1eee8;
        --shadow: 0 12px 30px rgba(31, 35, 40, 0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(180deg, #fbfaf7 0%, var(--bg) 100%);
        color: var(--text);
      }
      .shell {
        max-width: 1024px;
        margin: 0 auto;
        padding: 32px 20px 64px;
      }
      .topbar {
        display: flex;
        gap: 12px;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }
      .brand {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted);
      }
      .nav {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .nav-link {
        color: var(--link);
        text-decoration: none;
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.9);
      }
      .card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 24px;
        box-shadow: var(--shadow);
        padding: 32px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(28px, 4vw, 44px);
        line-height: 1.1;
      }
      .subtitle {
        margin: 0 0 24px;
        color: var(--muted);
      }
      .markdown h1, .markdown h2, .markdown h3, .markdown h4 {
        margin-top: 1.6em;
      }
      .markdown a { color: var(--link); }
      .markdown code {
        background: var(--code-bg);
        padding: 0.15rem 0.35rem;
        border-radius: 6px;
      }
      .markdown pre {
        background: #111827;
        color: #e5e7eb;
        padding: 16px;
        border-radius: 16px;
        overflow: auto;
      }
      .plain {
        white-space: pre-wrap;
      }
      .muted { color: var(--muted); }
      ul, ol { padding-left: 1.4rem; }
      table {
        border-collapse: collapse;
        width: 100%;
        overflow: hidden;
        display: block;
      }
      th, td {
        border: 1px solid var(--border);
        padding: 10px 12px;
        vertical-align: top;
      }
      blockquote {
        border-left: 4px solid var(--link);
        margin: 1rem 0;
        padding: 0.25rem 1rem;
        color: var(--muted);
        background: rgba(10, 91, 211, 0.05);
      }
      .directory ul { margin-top: 1rem; }
      .directory li { margin: 0.4rem 0; }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="topbar">
        <div>
          <div class="brand">Login CRM Docs</div>
          <h1>${this.escapeHtml(input.title)}</h1>
          <p class="subtitle">${this.escapeHtml(input.subtitle)}</p>
        </div>
        <div class="nav">${navLinks}</div>
      </div>
      <div class="card markdown">${input.body}</div>
    </div>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private encodePath(pathValue: string): string {
    return pathValue
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }
}
