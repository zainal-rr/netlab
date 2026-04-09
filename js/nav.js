// ============================================
// NetLab — Shared Floating Pill Nav
// Injected on every page. One source of truth.
// ============================================

const NAV_PAGES = [
  { href: 'index.html',       label: 'Home' },
  { href: 'chat.html',        label: 'AI Chat' },
  { href: 'analyzer.html',    label: 'Analyzer' },
  { href: 'auto-fetch.html',  label: 'Auto Fetch' },
  { href: 'screenshot.html',  label: 'Screenshot' },
  { href: 'qr.html',          label: 'QR SOS' },
  { href: 'feedback.html',     label: 'Feedback' },
];

const NAV_STYLE = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@500;600;700&display=swap');
    .nl-nav {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 6px 8px;
      background: rgba(13,13,18,0.88);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 99px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
      white-space: nowrap;
      font-family: 'Geist', system-ui, sans-serif;
    }
    .nl-logo {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 14px 4px 8px;
      font-size: 0.88rem; font-weight: 700;
      color: #f0ece6;
      border-right: 1px solid rgba(255,255,255,0.08);
      margin-right: 4px;
      text-decoration: none;
    }
    .nl-logo-dot {
      width: 22px; height: 22px; border-radius: 50%;
      background: rgba(79,142,247,0.1);
      border: 1px solid rgba(79,142,247,0.3);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .nl-logo-dot svg { width: 12px; height: 12px; }
    .nl-link {
      padding: 5px 12px;
      border-radius: 99px;
      font-size: 0.8rem; font-weight: 500;
      color: rgba(240,236,230,0.5);
      text-decoration: none;
      transition: color 150ms, background 150ms;
    }
    .nl-link:hover { color: #f0ece6; background: rgba(255,255,255,0.06); }
    .nl-link.active { color: #f0ece6; background: rgba(255,255,255,0.09); font-weight: 600; }
    .nl-cta {
      margin-left: 4px; padding: 6px 16px;
      border-radius: 99px; font-size: 0.8rem; font-weight: 700;
      background: #4f8ef7; color: #080400;
      text-decoration: none;
      transition: background 150ms, box-shadow 150ms;
    }
    .nl-cta:hover { background: #f09a63; box-shadow: 0 0 20px rgba(79,142,247,0.4); }
  </style>
`;

function buildNav() {
  const current = window.location.pathname.split('/').pop() || 'index.html';

  document.head.insertAdjacentHTML('beforeend', NAV_STYLE);

  const nav = document.createElement('nav');
  nav.className = 'nl-nav';

  nav.innerHTML = `
    <a href="index.html" class="nl-logo">
      <div class="nl-logo-dot">
        <svg viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2" x2="12" y2="7"/>
          <line x1="12" y1="17" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="7" y2="12"/>
          <line x1="17" y1="12" x2="22" y2="12"/>
        </svg>
      </div>
      NetLab
    </a>
    ${NAV_PAGES.map(p => `
      <a href="${p.href}" class="nl-link${p.href === current ? ' active' : ''}">${p.label}</a>
    `).join('')}
    <a href="chat.html" class="nl-cta">Get Started ↗</a>
  `;

  document.body.insertBefore(nav, document.body.firstChild);

  // Add top padding to page wrapper so nav doesn't overlap
  const page = document.querySelector('.page') || document.querySelector('body > div:not(.nl-nav)');
  if (page && !page.style.paddingTop) {
    page.style.paddingTop = page.style.paddingTop || '80px';
  }
}

document.addEventListener('DOMContentLoaded', buildNav);
