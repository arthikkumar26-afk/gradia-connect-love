// Build-time prerender plugin.
//
// After Vite emits dist/index.html, we copy it into dist/<route>/index.html
// for each entry in src/seo/routeMeta.ts and replace the head's title,
// description, canonical, og:*, and twitter:* tags with route-specific
// values. Lovable hosting serves the matching static file when the URL
// hits, so non-JS scrapers (LinkedIn, Slack, Facebook, WhatsApp) read
// the right preview metadata without needing SSR or a headless browser.
// React Router still owns runtime navigation — these files just shadow
// the SPA fallback for crawlers on first hit.

import type { Plugin } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";
import { routeMeta, SITE_ORIGIN, DEFAULT_IMAGE } from "../src/seo/routeMeta";

function escapeAttr(v: string) {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function injectMeta(html: string, meta: typeof routeMeta[number]) {
  const url = SITE_ORIGIN + (meta.path === "/" ? "/" : meta.path);
  const image = meta.ogImage || DEFAULT_IMAGE;
  const type = meta.ogType || "website";
  const t = escapeAttr(meta.title);
  const d = escapeAttr(meta.description);
  const u = escapeAttr(url);
  const img = escapeAttr(image);

  // Replace <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`);
  // Replace name="description"
  html = html.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${d}" />`,
  );
  // Drop existing canonical/og:*/twitter:* so we own them
  html = html.replace(/\s*<link\s+rel="canonical"[^>]*>/gi, "");
  html = html.replace(/\s*<meta\s+property="og:[^"]+"[^>]*>/gi, "");
  html = html.replace(/\s*<meta\s+name="twitter:[^"]+"[^>]*>/gi, "");

  const block = `
    <link rel="canonical" href="${u}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:url" content="${u}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:site_name" content="Gradia" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@gradia" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${img}" />`;

  // Insert right before </head>
  html = html.replace(/<\/head>/i, `${block}\n  </head>`);
  return html;
}

export default function prerenderMetaPlugin(): Plugin {
  return {
    name: "prerender-meta",
    apply: "build",
    async closeBundle() {
      const outDir = path.resolve(process.cwd(), "dist");
      const indexPath = path.join(outDir, "index.html");
      let baseHtml: string;
      try {
        baseHtml = await fs.readFile(indexPath, "utf8");
      } catch {
        return; // build output not where we expected; skip silently
      }

      for (const meta of routeMeta) {
        if (meta.path === "/") {
          // Rewrite the root index.html in place
          await fs.writeFile(indexPath, injectMeta(baseHtml, meta), "utf8");
          continue;
        }
        const dir = path.join(outDir, meta.path.replace(/^\//, ""));
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, "index.html"), injectMeta(baseHtml, meta), "utf8");
      }
      console.log(`[prerender-meta] wrote ${routeMeta.length} route HTML files`);
    },
  };
}
