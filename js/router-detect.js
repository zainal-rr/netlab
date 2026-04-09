// ============================================
// NetLab - Router Brand Fingerprinter
// Detects brand from root page HTML/title
// netlab.labsoft.uk
// ============================================

let ROUTER_DB = null;

async function loadRouterDB() {
  if (ROUTER_DB) return ROUTER_DB;
  try {
    const res = await fetch('../router-db.json');
    ROUTER_DB = await res.json();
  } catch {
    // Fallback inline DB if file not found
    ROUTER_DB = {
      fingerprints: [
        { match: ['TL-', 'Archer', 'TP-LINK', 'tplink'], brand: 'TP-Link', icon: '🔵' },
        { match: ['ASUS', 'RT-', 'AiMesh', 'asuswrt'], brand: 'ASUS', icon: '🟡' },
        { match: ['MikroTik', 'RouterOS'], brand: 'MikroTik', icon: '🔴' },
        { match: ['UniFi', 'Ubiquiti', 'Dream Machine'], brand: 'UniFi', icon: '🟢' },
        { match: ['D-Link', 'DIR-'], brand: 'D-Link', icon: '🟠' },
        { match: ['Huawei', 'HG8'], brand: 'Huawei', icon: '🔴' },
        { match: ['Xiaomi', 'MiWiFi'], brand: 'Xiaomi', icon: '🟠' },
      ],
      log_urls: {
        'TP-Link': [
          { path: '/cgi-bin/log_syslog.asp', confidence: 0.8 },
          { path: '/userRpm/SystemLogRpm.htm', confidence: 0.7 },
        ],
        'ASUS': [{ path: '/Main_LogStatus_Content.asp', confidence: 0.85 }],
        'generic': [{ path: '/cgi-bin/luci/admin/status/syslog', confidence: 0.5 }],
      },
      gateway_defaults: ['192.168.1.1', '192.168.0.1', '192.168.100.1', '10.0.0.1'],
    };
  }
  return ROUTER_DB;
}

// Try to fingerprint router from fetched HTML
function fingerprintFromHTML(html, db) {
  const text = html.toLowerCase();
  for (const fp of db.fingerprints) {
    if (fp.match.some(m => text.includes(m.toLowerCase()))) {
      return { brand: fp.brand, icon: fp.icon };
    }
  }
  return { brand: 'Unknown', icon: '⚪' };
}

// Detect router gateway IP
async function detectGateway() {
  const db = await loadRouterDB();
  // Try browser API first (Chrome only)
  if (window.chrome && chrome.socket) {
    // Extension context only — skip in browser
  }
  // Fallback: try common gateways
  for (const ip of db.gateway_defaults) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch(`http://${ip}/`, { signal: ctrl.signal, mode: 'no-cors' });
      clearTimeout(timeout);
      return ip; // reachable
    } catch {
      // continue
    }
  }
  return null;
}

// Fetch router root page and fingerprint brand
async function detectRouterBrand(gatewayIp) {
  const db = await loadRouterDB();
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`http://${gatewayIp}/`, { signal: ctrl.signal });
    const html = await res.text();
    return fingerprintFromHTML(html, db);
  } catch {
    return { brand: 'Unknown', icon: '⚪' };
  }
}

// Get log URLs for a brand, sorted by confidence
async function getLogUrls(brand) {
  const db = await loadRouterDB();
  const urls = db.log_urls[brand] || db.log_urls['generic'] || [];
  const generic = db.log_urls['generic'] || [];
  // Merge brand-specific + generic, deduplicate by path
  const all = [...urls, ...generic].filter((u, i, arr) =>
    arr.findIndex(x => x.path === u.path) === i
  );
  return all.sort((a, b) => b.confidence - a.confidence);
}

export { loadRouterDB, detectGateway, detectRouterBrand, getLogUrls, fingerprintFromHTML };
