// ============================================
// NetLab - Log Analyzer Engine
// netlab.labsoft.uk
// ============================================

const PATTERNS = [
  {
    id: 'security_threat',
    severity: 'CRITICAL',
    match: (log) => /syn.?flood|port.?scan|brute.?force|ddos|intrusion.?detect|suspicious.?login/i.test(log),
    title_en: 'Security Threat Detected',
    title_bm: 'Ancaman Keselamatan Dikesan',
    explanation_en: 'Your router logs show signs of a cyberattack. This could be a SYN flood, port scan, or brute-force attempt targeting your network. Immediate action is required.',
    explanation_bm: 'Log router anda menunjukkan tanda-tanda serangan siber. Ini boleh jadi serangan SYN flood, imbasan port, atau percubaan brute-force yang menyasarkan rangkaian anda. Tindakan segera diperlukan.',
    steps_en: [
      'Log into your router admin panel immediately (192.168.1.1 or 192.168.0.1)',
      'Enable the built-in firewall if not already active',
      'Block the suspicious IP address in the firewall rules',
      'Change your router admin password and WiFi password',
      'Contact your ISP (Unifi/Maxis/Time) to report the attack',
    ],
    steps_bm: [
      'Log masuk ke panel admin router anda segera (192.168.1.1 atau 192.168.0.1)',
      'Aktifkan firewall terbina jika belum aktif',
      'Sekat alamat IP yang mencurigakan dalam peraturan firewall',
      'Tukar kata laluan admin router dan kata laluan WiFi',
      'Hubungi ISP anda (Unifi/Maxis/Time) untuk melaporkan serangan ini',
    ],
  },
  {
    id: 'pppoe_drop',
    severity: 'WARNING',
    match: (log) => /(pppoe|lcp|ppp).*(timeout|fail|disconnect|down|drop)/i.test(log) || /(wan|internet).*(down|disconnect|fail)/i.test(log),
    title_en: 'ISP / WAN Disconnection',
    title_bm: 'Pemutusan ISP / WAN',
    explanation_en: 'Your router is losing its PPPoE connection to your ISP (common with Unifi and Maxis fiber). This causes internet dropouts. Usually caused by line instability, incorrect credentials, or ISP-side issues.',
    explanation_bm: 'Router anda kehilangan sambungan PPPoE ke ISP (biasa berlaku dengan Unifi dan Maxis fiber). Ini menyebabkan gangguan internet. Biasanya disebabkan ketidakstabilan talian, kelayakan salah, atau masalah dari pihak ISP.',
    steps_en: [
      'Restart your router and ONT/modem (power off 30 seconds, then on)',
      'Check PPPoE username and password in router settings — must match your ISP account',
      'Inspect the fiber cable from ONT to router for physical damage',
      'Log a fault report with Unifi (1300-88-1221) or Maxis (1800-82-1123)',
      'If drops happen at the same time daily, it may be ISP maintenance — note the pattern',
    ],
    steps_bm: [
      'Mulakan semula router dan ONT/modem anda (matikan 30 saat, kemudian hidupkan)',
      'Semak nama pengguna dan kata laluan PPPoE dalam tetapan router — mesti sepadan dengan akaun ISP anda',
      'Periksa kabel fiber dari ONT ke router untuk kerosakan fizikal',
      'Laporkan gangguan kepada Unifi (1300-88-1221) atau Maxis (1800-82-1123)',
      'Jika gangguan berlaku pada waktu yang sama setiap hari, ia mungkin penyelenggaraan ISP — catat coraknya',
    ],
  },
  {
    id: 'auth_fail',
    severity: 'WARNING',
    match: (log) => /auth.*fail|wrong.*password|invalid.*credential|login.*fail|access.*denied/i.test(log),
    title_en: 'Authentication Failure',
    title_bm: 'Kegagalan Pengesahan',
    explanation_en: 'Authentication failures detected in your logs. This could be a wrong WiFi password being entered repeatedly, or someone trying to gain unauthorized access to your network.',
    explanation_bm: 'Kegagalan pengesahan dikesan dalam log anda. Ini boleh jadi kata laluan WiFi yang salah dimasukkan berulang kali, atau seseorang cuba mendapat akses tanpa kebenaran ke rangkaian anda.',
    steps_en: [
      'Check if you recently changed your WiFi password — update it on all your devices',
      'Look at the MAC address in the logs — is it a device you recognize?',
      'If it\'s an unknown device, your password may be compromised — change it now',
      'Use WPA3 or WPA2 encryption (avoid WEP — it is easily cracked)',
      'Enable MAC address filtering to whitelist only your trusted devices',
    ],
    steps_bm: [
      'Semak sama ada anda baru-baru ini menukar kata laluan WiFi — kemas kini pada semua peranti anda',
      'Lihat alamat MAC dalam log — adakah ia peranti yang anda kenali?',
      'Jika ia peranti tidak dikenali, kata laluan anda mungkin telah terdedah — tukarnya sekarang',
      'Gunakan penyulitan WPA3 atau WPA2 (elakkan WEP — ia mudah dipecahkan)',
      'Aktifkan penapisan alamat MAC untuk hanya membenarkan peranti anda yang dipercayai',
    ],
  },
  {
    id: 'weak_signal',
    severity: 'WARNING',
    match: (log) => /rssi.*-[89]\d|rssi.*-[1-9]\d\d|signal.*(weak|poor|low)|noise.*(high|floor)/i.test(log),
    title_en: 'Weak WiFi Signal / Poor Coverage',
    title_bm: 'Isyarat WiFi Lemah / Liputan Buruk',
    explanation_en: 'Your logs show low RSSI values (weak WiFi signal strength). This causes slow speeds, dropped connections, and buffering. The device is too far from the router or there is interference.',
    explanation_bm: 'Log anda menunjukkan nilai RSSI yang rendah (kekuatan isyarat WiFi lemah). Ini menyebabkan kelajuan rendah, sambungan terputus, dan penimbal. Peranti terlalu jauh dari router atau ada gangguan.',
    steps_en: [
      'Move your router to a central, elevated location in your home',
      'Reduce obstacles between your device and router (walls, furniture)',
      'Switch to 5GHz WiFi band if your device supports it (faster, less interference)',
      'Change the WiFi channel — use channel 1, 6, or 11 for 2.4GHz to avoid neighbours',
      'Consider a WiFi mesh system (TP-Link Deco, ASUS ZenWiFi) for large homes',
    ],
    steps_bm: [
      'Pindahkan router ke lokasi tengah dan tinggi di rumah anda',
      'Kurangkan halangan antara peranti dan router anda (dinding, perabot)',
      'Tukar ke jalur WiFi 5GHz jika peranti anda menyokongnya (lebih laju, kurang gangguan)',
      'Tukar saluran WiFi — gunakan saluran 1, 6, atau 11 untuk 2.4GHz untuk elakkan jiran',
      'Pertimbangkan sistem WiFi mesh (TP-Link Deco, ASUS ZenWiFi) untuk rumah besar',
    ],
  },
  {
    id: 'dns_fail',
    severity: 'WARNING',
    match: (log) => /dns.*(fail|error|timeout|nxdomain|refused)|nxdomain|name.*(resolution|resolve).*(fail|error)/i.test(log),
    title_en: 'DNS Resolution Failure',
    title_bm: 'Kegagalan Resolusi DNS',
    explanation_en: 'Your router cannot resolve domain names (translate website addresses to IP addresses). Websites may not load even though your internet connection is active. Often caused by ISP DNS server issues.',
    explanation_bm: 'Router anda tidak dapat menyelesaikan nama domain (menterjemah alamat laman web kepada alamat IP). Laman web mungkin tidak memuatkan walaupun sambungan internet anda aktif. Sering disebabkan oleh masalah pelayan DNS ISP.',
    steps_en: [
      'Change DNS server to Google (8.8.8.8 / 8.8.4.4) or Cloudflare (1.1.1.1) in router settings',
      'Flush DNS cache: run "ipconfig /flushdns" on Windows or "sudo dscacheutil -flushcache" on Mac',
      'Test if the issue is DNS-only: try accessing a site by IP (e.g., ping 8.8.8.8)',
      'Restart your router — sometimes the DHCP lease renews and DNS fixes itself',
      'Contact your ISP if custom DNS doesn\'t help — their DNS server may be down',
    ],
    steps_bm: [
      'Tukar pelayan DNS ke Google (8.8.8.8 / 8.8.4.4) atau Cloudflare (1.1.1.1) dalam tetapan router',
      'Kosongkan cache DNS: jalankan "ipconfig /flushdns" di Windows atau "sudo dscacheutil -flushcache" di Mac',
      'Uji sama ada masalah hanya DNS: cuba akses tapak melalui IP (contoh, ping 8.8.8.8)',
      'Mulakan semula router anda — kadangkala pajakan DHCP diperbaharui dan DNS diperbaiki dengan sendirinya',
      'Hubungi ISP anda jika DNS tersuai tidak membantu — pelayan DNS mereka mungkin sedang rosak',
    ],
  },
  {
    id: 'overheating',
    severity: 'WARNING',
    match: (log) => /temp.*[89]\d|temperature.*[89]\d|overheat|thermal|cpu.*hot|high.*temp/i.test(log),
    title_en: 'Hardware Overheating',
    title_bm: 'Kepanasan Perkakasan',
    explanation_en: 'Your router\'s temperature is critically high. Overheating causes slowdowns, random reboots, and can permanently damage hardware. Common in poorly ventilated areas or tropical Malaysian weather.',
    explanation_bm: 'Suhu router anda sangat tinggi. Kepanasan berlebihan menyebabkan kelambatan, but semula rawak, dan boleh merosakkan perkakasan secara kekal. Biasa berlaku di kawasan yang kurang pengudaraan atau cuaca Malaysia yang panas.',
    steps_en: [
      'Move router to a well-ventilated area — not inside a cabinet or cupboard',
      'Ensure at least 10cm clearance on all sides of the router',
      'Clean dust from router vents using compressed air',
      'Do not stack other devices on top of the router',
      'If overheating persists, the router may need replacing — contact your ISP or retailer',
    ],
    steps_bm: [
      'Pindahkan router ke kawasan yang mempunyai pengudaraan yang baik — bukan di dalam kabinet atau almari',
      'Pastikan sekurang-kurangnya 10cm ruang di semua bahagian router',
      'Bersihkan habuk dari lubang angin router menggunakan udara mampat',
      'Jangan letak peranti lain di atas router',
      'Jika kepanasan berterusan, router mungkin perlu diganti — hubungi ISP atau peruncit anda',
    ],
  },
];

const FALLBACK = {
  severity: 'OK',
  title_en: 'No Critical Issues Detected',
  title_bm: 'Tiada Masalah Kritikal Dikesan',
  explanation_en: 'Your logs look relatively clean. No obvious security threats, ISP disconnections, or hardware failures were detected. If you are still experiencing issues, they may be intermittent or not captured in these logs.',
  explanation_bm: 'Log anda kelihatan agak bersih. Tiada ancaman keselamatan yang jelas, pemutusan ISP, atau kegagalan perkakasan dikesan. Jika anda masih mengalami masalah, ia mungkin berselang-seli atau tidak ditangkap dalam log ini.',
  steps_en: [
    'Try restarting your router (power off 30 seconds)',
    'Check if the issue happens on all devices or just one',
    'Run a speed test at fast.com to verify your bandwidth',
    'Collect more logs over a longer period to capture intermittent issues',
    'Paste more detailed logs or contact your ISP if the problem persists',
  ],
  steps_bm: [
    'Cuba mulakan semula router anda (matikan 30 saat)',
    'Semak sama ada masalah berlaku pada semua peranti atau hanya satu',
    'Jalankan ujian kelajuan di fast.com untuk mengesahkan jalur lebar anda',
    'Kumpulkan lebih banyak log dalam tempoh yang lebih lama untuk menangkap masalah berselang-seli',
    'Tampal log yang lebih terperinci atau hubungi ISP anda jika masalah berterusan',
  ],
};

function detectRouter(log) {
  const lower = log.toLowerCase();
  if (/archer|tplink|tp-link|be[0-9]{3,}|ax[0-9]{3,}/.test(lower)) return '🔵 TP-Link';
  if (/asus|rt-[a-z]|asuswrt/.test(lower)) return '🟡 ASUS';
  if (/mikrotik|routeros|ros\s/.test(lower)) return '🔴 MikroTik';
  if (/unifi|ubiquiti|edgeos/.test(lower)) return '🟢 UniFi';
  if (/maxis|huawei.*hg|dlink/.test(lower)) return '🟠 Maxis/D-Link';
  return '⚪ Unknown Router';
}

function analyzeLog(text) {
  for (const pattern of PATTERNS) {
    if (pattern.match(text)) {
      return {
        severity: pattern.severity,
        title_en: pattern.title_en,
        title_bm: pattern.title_bm,
        explanation_en: pattern.explanation_en,
        explanation_bm: pattern.explanation_bm,
        steps_en: pattern.steps_en,
        steps_bm: pattern.steps_bm,
        router: detectRouter(text),
      };
    }
  }
  return { ...FALLBACK, router: detectRouter(text) };
}

// ============================================ UI Logic
let currentLang = 'en';
let currentResult = null;

function setLang(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  if (currentResult) renderResult(currentResult);
}

function severityClass(s) {
  if (s === 'CRITICAL') return 'severity-critical';
  if (s === 'WARNING') return 'severity-warning';
  return 'severity-ok';
}

function severityIcon(s) {
  if (s === 'CRITICAL') return '🔴';
  if (s === 'WARNING') return '🟡';
  return '🟢';
}

function renderResult(result) {
  const card = document.getElementById('result-card');
  const empty = document.getElementById('result-empty');
  const loading = document.getElementById('loading-overlay');
  const lang = currentLang;

  if (empty) empty.style.display = 'none';
  if (loading) loading.classList.remove('visible');
  card.classList.add('visible');

  const title = lang === 'en' ? result.title_en : result.title_bm;
  const explanation = lang === 'en' ? result.explanation_en : result.explanation_bm;
  const steps = lang === 'en' ? result.steps_en : result.steps_bm;

  document.getElementById('severity-badge').className = `severity-badge ${severityClass(result.severity)}`;
  document.getElementById('severity-badge').innerHTML = `${severityIcon(result.severity)} ${result.severity}`;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-explanation').textContent = explanation;
  document.getElementById('router-detected').innerHTML = `📡 ${result.router}`;

  const stepsList = document.getElementById('result-steps');
  stepsList.innerHTML = steps.map((s, i) =>
    `<li><span class="step-num">${i + 1}</span><span>${s}</span></li>`
  ).join('');
}

function startAnalysis() {
  const text = document.getElementById('log-input').value.trim();
  if (!text) {
    alert('Please paste some log data first.');
    return;
  }

  const btn = document.getElementById('analyze-btn');
  const card = document.getElementById('result-card');
  const empty = document.getElementById('result-empty');
  const loading = document.getElementById('loading-overlay');
  const progressFill = document.getElementById('progress-fill');

  // Reset
  card.classList.remove('visible');
  if (empty) empty.style.display = 'none';
  loading.classList.add('visible');
  btn.disabled = true;

  // Animate progress bar
  let progress = 0;
  const messages = ['Scanning log patterns...', 'Identifying router brand...', 'Running AI analysis...', 'Generating report...'];
  let msgIdx = 0;
  const loadingText = document.getElementById('loading-text');

  const interval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 15, 95);
    progressFill.style.width = progress + '%';
    if (progress > 25 * (msgIdx + 1) && msgIdx < messages.length - 1) {
      msgIdx++;
      loadingText.textContent = messages[msgIdx];
    }
  }, 150);

  setTimeout(() => {
    clearInterval(interval);
    progressFill.style.width = '100%';
    setTimeout(() => {
      currentResult = analyzeLog(text);
      renderResult(currentResult);
      btn.disabled = false;
    }, 300);
  }, 2500);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  const analyzeBtn = document.getElementById('analyze-btn');
  if (analyzeBtn) analyzeBtn.addEventListener('click', startAnalysis);

  // Allow Ctrl+Enter to analyze
  const logInput = document.getElementById('log-input');
  if (logInput) {
    logInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') startAnalysis();
    });
  }
});
