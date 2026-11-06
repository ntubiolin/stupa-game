#!/usr/bin/env node
/**
 * Codex Reference URL Checker (`scripts/check-links.mjs`) — Issue #37
 *
 * Extracts all external reference URLs from `src/data/codex.js` and `src/data/codex/*.js`,
 * performs HTTP HEAD / GET requests (following redirects), and verifies each URL is reachable
 * (no 404 / 410 / 5xx / DNS errors).
 * Exits with non-zero code (1) if any broken links are found.
 */

import { CODEX_ENTRIES } from '../src/data/codex.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function checkUrl(url, timeoutMs = 12000) {
  for (const method of ['HEAD', 'GET']) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      clearTimeout(timer);
      if (res.ok || (res.status >= 200 && res.status < 400)) {
        return { ok: true, status: res.status, finalUrl: res.url };
      }
      // Cloudflare / WAF bot-protection on academic sites (e.g. UNESCO, Britannica, Rigpa Wiki, Treasury of Lives, HAR)
      // returns 403 to non-browser TLS fingerprints when the host & route are live, whereas missing pages or dead hosts return 404/5xx/DNS failure.
      if (res.status === 403 && method === 'GET') {
        return { ok: true, status: 403, note: 'WAF/Cloudflare reachable', finalUrl: res.url };
      }
      if (method === 'GET') {
        return { ok: false, status: res.status, error: `HTTP ${res.status}` };
      }
    } catch (err) {
      clearTimeout(timer);
      if (method === 'GET') {
        return { ok: false, status: 0, error: err?.message || String(err) };
      }
    }
  }
  return { ok: false, status: 0, error: 'Unreachable' };
}

const urlMap = new Map(); // url -> Set<entryId>
for (const entry of CODEX_ENTRIES) {
  if (!entry || !Array.isArray(entry.sources)) continue;
  for (const src of entry.sources) {
    if (!src?.url) continue;
    if (!urlMap.has(src.url)) urlMap.set(src.url, new Set());
    urlMap.get(src.url).add(entry.id);
  }
}

const uniqueUrls = Array.from(urlMap.keys());
console.log(`[check:links] Checking ${uniqueUrls.length} unique URLs across ${CODEX_ENTRIES.length} Codex entries...`);

const broken = [];
for (const url of uniqueUrls) {
  const entries = Array.from(urlMap.get(url)).join(', ');
  const res = await checkUrl(url);
  if (res.ok) {
    const tag = res.note ? `${res.status} (${res.note})` : String(res.status);
    console.log(`  ✓ [${tag}] ${url} (${entries})`);
  } else {
    console.error(`  ✗ [${res.error}] ${url} (${entries})`);
    broken.push({ url, entries, error: res.error });
  }
}

if (broken.length > 0) {
  console.error(`\n❌ [check:links] Found ${broken.length} broken or unreachable link(s):`);
  for (const b of broken) {
    console.error(`  - ${b.url} (${b.error}) in [${b.entries}]`);
  }
  process.exit(1);
}

console.log(`\n✅ [check:links] All ${uniqueUrls.length} Codex reference URLs across ${CODEX_ENTRIES.length} entries are valid and reachable!`);
