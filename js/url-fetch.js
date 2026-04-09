// ============================================
// NetLab - URL Auto-Fetch Engine
// Tries known router log URLs sequentially
// netlab.labsoft.uk
// ============================================

import { loadRouterDB, detectRouterBrand, getLogUrls } from './router-detect.js';

const FETCH_TIMEOUT_MS = 3000;

// Log extraction: pull meaningful lines from raw HTML
function extractLogText(html) {
  // Strip HTML tags
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s{2,}/g, '\n')
    .trim();

  // Filter: keep lines that look like log entries
  const lines = text.split('\n').filter(line => {
    const l = line.trim();
    if (l.length < 10) return false;
    // Log-like: contains timestamp patterns or known keywords
    return /\d{4}|\d{2}:\d{2}:\d{2}|error|warn|info|ppp|wan|dhcp|dns|auth|firewall|kernel|syslog/i.test(l);
  });

  return lines.length > 5
    ? lines.join('\n')
    : text.substring(0, 3000); // fallback: first 3000 chars
}

// Try a single URL
async function tryFetchUrl(baseUrl, path) {
  const url = `${baseUrl}${path}`;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      credentials: 'include', // send cookies for router session
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 50) return null; // empty page
    const logText = extractLogText(html);
    if (!logText || logText.length < 30) return null;
    return { url, text: logText, status: res.status };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// Main: try all known URLs for detected brand
async function autoFetchLogs(gatewayIp, onProgress) {
  const db = await loadRouterDB();
  const base = `http://${gatewayIp}`;

  // Step 1: Detect brand
  onProgress?.({ stage: 'detect', message: `Identifying router at ${gatewayIp}...`, percent: 10 });
  const brand = await detectRouterBrand(gatewayIp);
  onProgress?.({ stage: 'brand', message: `Detected: ${brand.icon} ${brand.brand}`, percent: 25, brand });

  // Step 2: Get URLs to try
  const urls = await getLogUrls(brand.brand);
  onProgress?.({ stage: 'urls', message: `Trying ${urls.length} known log paths...`, percent: 30 });

  // Step 3: Try each URL
  let tried = 0;
  for (const entry of urls) {
    tried++;
    const pct = 30 + Math.round((tried / urls.length) * 60);
    onProgress?.({
      stage: 'trying',
      message: `Trying ${entry.path}... (${tried}/${urls.length})`,
      percent: pct,
      path: entry.path,
    });

    const result = await tryFetchUrl(base, entry.path);
    if (result) {
      onProgress?.({ stage: 'success', message: 'Logs found!', percent: 100, result, brand });
      return { success: true, brand, url: result.url, logText: result.text };
    }
  }

  // All failed
  onProgress?.({ stage: 'failed', message: 'Auto-fetch failed. Try screenshot OCR instead.', percent: 100 });
  return { success: false, brand, logText: null };
}

export { autoFetchLogs, tryFetchUrl, extractLogText };
