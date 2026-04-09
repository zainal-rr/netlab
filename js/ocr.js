// ============================================
// NetLab - OCR Screenshot Engine
// Uses Tesseract.js (loaded from CDN)
// netlab.labsoft.uk
// ============================================

// Tesseract.js is loaded via CDN script tag in screenshot.html
// window.Tesseract will be available

let tesseractWorker = null;

async function initOCR(onProgress) {
  if (tesseractWorker) return tesseractWorker;

  onProgress?.({ stage: 'init', message: 'Loading OCR engine...', percent: 5 });

  if (typeof Tesseract === 'undefined') {
    throw new Error('Tesseract.js not loaded. Check your internet connection.');
  }

  tesseractWorker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const pct = Math.round(m.progress * 70) + 20;
        onProgress?.({ stage: 'ocr', message: 'Reading text from image...', percent: pct });
      } else if (m.status === 'loading tesseract core') {
        onProgress?.({ stage: 'load', message: 'Loading OCR engine...', percent: 10 });
      } else if (m.status === 'loading language traineddata') {
        onProgress?.({ stage: 'lang', message: 'Loading language data...', percent: 15 });
      }
    },
  });

  return tesseractWorker;
}

// Pre-process image for better OCR on router UIs
function preprocessImage(imgElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Scale up for better OCR accuracy
  const scale = Math.min(3, 2400 / imgElement.naturalWidth);
  canvas.width = imgElement.naturalWidth * scale;
  canvas.height = imgElement.naturalHeight * scale;

  // Apply contrast boost for dark/light router UIs
  ctx.filter = 'contrast(1.4) brightness(1.1)';
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

  return canvas;
}

// Filter OCR output to find log-like lines
function extractLogLines(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  const logLines = lines.filter(line => {
    // Must be reasonably long
    if (line.length < 8) return false;
    // Must look like a log (timestamp, keywords, etc.)
    return /\d{2}:\d{2}|\d{4}-\d{2}|\b(error|warn|info|fail|ppp|wan|dns|dhcp|auth|kernel|drop|block|connect|timeout)\b/i.test(line);
  });

  // Return log lines if we found enough, otherwise return all non-trivial lines
  return logLines.length >= 3
    ? logLines.join('\n')
    : lines.filter(l => l.length > 10).join('\n');
}

// Main OCR function
async function ocrScreenshot(imageSource, onProgress) {
  onProgress?.({ stage: 'start', message: 'Starting OCR...', percent: 5 });

  let worker;
  try {
    worker = await initOCR(onProgress);
  } catch (e) {
    return { success: false, error: e.message, text: null };
  }

  try {
    onProgress?.({ stage: 'recognizing', message: 'Scanning your screenshot...', percent: 20 });

    // If imageSource is an img element, preprocess it
    let source = imageSource;
    if (imageSource instanceof HTMLImageElement) {
      source = preprocessImage(imageSource);
    }

    const { data } = await worker.recognize(source);
    const rawText = data.text;
    const confidence = data.confidence;

    onProgress?.({ stage: 'extracting', message: 'Extracting log entries...', percent: 90 });

    const logText = extractLogLines(rawText);

    onProgress?.({ stage: 'done', message: 'OCR complete!', percent: 100 });

    return {
      success: true,
      text: logText,
      rawText,
      confidence: Math.round(confidence),
      lineCount: logText.split('\n').length,
    };
  } catch (e) {
    return { success: false, error: e.message, text: null };
  }
}

// Cleanup worker when done
async function destroyOCR() {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
}

export { ocrScreenshot, initOCR, destroyOCR, extractLogLines };
