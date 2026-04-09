// ============================================
// NetLab - QR SOS Bridge
// netlab.labsoft.uk
// ============================================

let qrInstance = null;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}

function generateQR() {
  const text = document.getElementById('qr-log-input').value.trim();
  if (!text) {
    alert('Please paste your log data first.');
    return;
  }

  const btn = document.getElementById('qr-btn');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  // Simulate brief processing
  setTimeout(() => {
    // Encode: base64 of the log text
    const encoded = btoa(unescape(encodeURIComponent(text)));

    // Build the payload URL that would go to the server
    const payload = `https://netlab.labsoft.uk/scan?data=${encoded.substring(0, 800)}`;

    // Stats
    const originalSize = new Blob([text]).size;
    const encodedSize = new Blob([encoded]).size;

    document.getElementById('stat-original').textContent = formatBytes(originalSize);
    document.getElementById('stat-encoded').textContent = formatBytes(encodedSize);

    // Clear previous QR
    const container = document.getElementById('qr-canvas');
    container.innerHTML = '';
    if (qrInstance) {
      qrInstance = null;
    }

    // Generate QR using qrcode.js
    try {
      qrInstance = new QRCode(container, {
        text: payload,
        width: 220,
        height: 220,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
    } catch (e) {
      container.innerHTML = '<p style="color: var(--danger); text-align:center; padding:20px;">QR library failed to load. Check your internet connection for CDN.</p>';
    }

    // Show output
    document.getElementById('qr-output').classList.add('visible');

    // Update steps
    document.querySelectorAll('.qr-step').forEach((s, i) => {
      s.classList.toggle('active', i === 2);
    });

    btn.disabled = false;
    btn.textContent = 'Regenerate QR';
  }, 600);
}

function downloadQR() {
  const canvas = document.querySelector('#qr-canvas canvas');
  const img = document.querySelector('#qr-canvas img');

  if (canvas) {
    const link = document.createElement('a');
    link.download = 'netlab-sos-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } else if (img) {
    const link = document.createElement('a');
    link.download = 'netlab-sos-qr.png';
    link.href = img.src;
    link.click();
  } else {
    alert('Generate a QR code first.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('qr-btn');
  if (btn) btn.addEventListener('click', generateQR);

  const dlBtn = document.getElementById('qr-download');
  if (dlBtn) dlBtn.addEventListener('click', downloadQR);

  const input = document.getElementById('qr-log-input');
  if (input) {
    input.addEventListener('input', () => {
      document.querySelectorAll('.qr-step').forEach((s, i) => {
        s.classList.toggle('active', i === (input.value.trim() ? 1 : 0));
      });
    });
  }
});
