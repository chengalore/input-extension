'use strict';

// ─── Type definitions ────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  bag: {
    required: ['height', 'width'],
    optional: ['depth'],
  },
};

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Split a raw line into [sizeLabel, measurementString].
 * Handles both tab-separated and space-separated colon delimiters:
 *   "ONE SIZE\t:\tDimensions: ..."
 *   "SMALL : Dimensions: ..."
 */
const QUALIFIER_LABEL = /^approx\.?$/i;

function splitLine(line) {
  // Match label then optional-whitespace:whitespace then rest
  // Handles "ONE SIZE : ...", "ONE SIZE\t:\t...", and "Approx.: ..."
  const m = line.match(/^(.+?)\s*:\s+(.+)$/);
  if (!m) return null;
  const label = m[1].trim();
  // Qualifiers like "Approx." are prefixes, not real size labels
  return [QUALIFIER_LABEL.test(label) ? 'ONE SIZE' : label, m[2].trim()];
}

/**
 * Parse a measurement segment like "Dimensions: 10.5 x 8.5 cm" or "Thickness: 2.5 cm"
 * Returns an object with any of: height, width, depth
 */
function parseSegment(segment, type) {
  const result = {};

  // "(W x ignored) x H x D [cm]" — e.g. "Approx.: (41 x 29) x 25 x 13 cm"
  // Unanchored so it works with leading prefixes like "Approx.: "
  const parenMatch = segment.match(/\(\s*([\d.]+)\s*[xX×]\s*[\d.]+\s*\)\s*[xX×]\s*([\d.]+)\s*[xX×]\s*([\d.]+)/i);
  if (parenMatch) {
    if (type === 'bag') {
      result.width = parseFloat(parenMatch[1]);
      result.height = parseFloat(parenMatch[2]);
      result.depth = parseFloat(parenMatch[3]);
    }
    return result;
  }

  // "Dimensions: H x W [cm]" — first = height, second = width
  const dimMatch = segment.match(/^dimensions?\s*:\s*([\d.]+)\s*[xX×]\s*([\d.]+)/i);
  if (dimMatch) {
    if (type === 'bag') {
      result.height = parseFloat(dimMatch[1]);
      result.width = parseFloat(dimMatch[2]);
    }
    return result;
  }

  // "Thickness: N [cm]" → depth
  const thicknessMatch = segment.match(/^thickness\s*:?\s*([\d.]+)/i);
  if (thicknessMatch) {
    result.depth = parseFloat(thicknessMatch[1]);
    return result;
  }

  // Named single dimensions — colon is optional ("Width 22cm" or "Width: 22cm")
  // Anchored to segment start to avoid partial matches ("Shoulder strap length", etc.)
  const named = [
    { re: /^height\s*:?\s*([\d.]+)/i, out: 'height' },
    { re: /^width\s*:?\s*([\d.]+)/i, out: 'width' },
    { re: /^depth\s*:?\s*([\d.]+)/i, out: 'depth' },
  ];
  for (const { re, out } of named) {
    const m = segment.match(re);
    if (m) {
      result[out] = parseFloat(m[1]);
      return result;
    }
  }

  return result;
}

function parseMeasurementString(measurementStr, type) {
  const segments = measurementStr.split('/').map(s => s.trim());
  let combined = {};
  for (const seg of segments) {
    Object.assign(combined, parseSegment(seg, type));
  }
  return combined;
}

function parse(rawText, type) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const sizes = {};
  const errors = [];

  for (const line of lines) {
    const split = splitLine(line);
    if (!split) {
      errors.push(`Could not parse line: "${line}"`);
      continue;
    }
    const [label, measurementStr] = split;
    const measurements = parseMeasurementString(measurementStr, type);

    const config = TYPE_CONFIG[type];
    const missing = config.required.filter(k => !(k in measurements));
    if (missing.length > 0) {
      errors.push(`"${label}" is missing required fields: ${missing.join(', ')}`);
    }

    sizes[label] = measurements;
  }

  return { sizes, errors };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function toOutputJSON(sizes, type) {
  const inner = JSON.stringify({ sizes, type }, null, 2);
  // Strip the outer { } so the output is a pasteable object fragment
  return inner.slice(2, -2).replace(/^  /mg, '');
}

// ─── UI ───────────────────────────────────────────────────────────────────────

const parseBtn = document.getElementById('parse-btn');
const copyBtn = document.getElementById('copy-btn');
const inputText = document.getElementById('input-text');
const typeSelect = document.getElementById('type-select');
const outputSection = document.getElementById('output-section');
const outputPre = document.getElementById('output');
const errorMsg = document.getElementById('error-msg');

parseBtn.addEventListener('click', () => {
  const raw = inputText.value.trim();
  const type = typeSelect.value;

  errorMsg.classList.add('hidden');
  outputSection.classList.add('hidden');

  if (!raw) {
    showError('Paste measurement text first.');
    return;
  }

  const { sizes, errors } = parse(raw, type);

  if (Object.keys(sizes).length === 0) {
    showError(errors.length ? errors.join('\n') : 'No measurements found. Check the format.');
    return;
  }

  outputPre.textContent = toOutputJSON(sizes, type);
  outputSection.classList.remove('hidden');

  if (errors.length) {
    showError(errors.join('\n'));
  }
});

copyBtn.addEventListener('click', () => {
  const text = outputPre.textContent;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'Copy';
      copyBtn.classList.remove('copied');
    }, 1500);
  });
});

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}
