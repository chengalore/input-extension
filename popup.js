'use strict';

// ─── Type definitions ────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  bag: {
    required: ['height', 'width'],
    optional: ['depth'],
  },
  shirt: {
    required: ['height', 'bust'],
    optional: ['shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem', 'bicep'],
  },
  tShirt: {
    required: ['height', 'bust'],
    optional: ['shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem', 'bicep'],
  },
  jacket: {
    required: ['height', 'bust'],
    optional: ['shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem', 'bicep'],
  },
  coat: {
    required: ['height', 'bust'],
    optional: ['shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem', 'bicep'],
  },
  dress: {
    required: ['height', 'bust'],
    optional: ['shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem'],
  },
};

const TOPS_TYPES = new Set(['shirt', 'tShirt', 'jacket', 'coat', 'dress']);

// Column header (lowercase) → output field name
const TOPS_COLUMN_MAP = {
  'length':           'height',
  'total length':     'height',
  'shoulder width':   'shoulder',
  'shoulder':         'shoulder',
  'body width':       'bust',
  'chest width':      'bust',
  'chest':            'bust',
  'bust':             'bust',
  'bust width':       'bust',
  'sleeve length':    'sleeve_length',
  'sleeve':           'sleeve',
  'waist':            'waist',
  'waist width':      'waist',
  'hem':              'hem',
  'hem width':        'hem',
  'bicep':            'bicep',
};

// ─── Tabular parser (shirt / tShirt / jacket / coat) ─────────────────────────

function extractNumbers(str) {
  return [...str.matchAll(/[\d.]+/g)].map(m => parseFloat(m[0]));
}

function parseTabular(rawText, type) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { sizes: {}, errors: ['Need at least a header row and one data row.'] };
  }

  const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
  const sizeIdx = headers.findIndex(h => h === 'size');
  if (sizeIdx === -1) {
    return { sizes: {}, errors: ['No "size" column found in header row.'] };
  }

  // Map each column index to its output field name
  const indexToField = {};
  headers.forEach((h, i) => {
    if (i === sizeIdx) return;
    const field = TOPS_COLUMN_MAP[h];
    if (field) indexToField[i] = field;
  });

  const sizes = {};
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t').map(c => c.trim());
    const sizeLabel = cols[sizeIdx];
    if (!sizeLabel) continue;

    const measurements = {};
    for (const [idxStr, field] of Object.entries(indexToField)) {
      const cell = cols[Number(idxStr)] ?? '';
      if (!cell) continue;
      const nums = extractNumbers(cell);
      if (nums.length === 0) continue;
      // Always use the first number — covers "Dress: 122 Inner camisole: 83" → 122
      // and "Before: 70 After: 73" → 70 (first is also the smaller one for shirts)
      measurements[field] = nums[0];
    }

    // sleeve = half shoulder + sleeve_length (center back neck to sleeve edge)
    if ('shoulder' in measurements && 'sleeve_length' in measurements) {
      measurements.sleeve = measurements.shoulder / 2 + measurements.sleeve_length;
    }

    const config = TYPE_CONFIG[type];
    const missing = config.required.filter(k => !(k in measurements));
    if (missing.length > 0) {
      errors.push(`"${sizeLabel}" is missing required fields: ${missing.join(', ')}`);
    }

    sizes[sizeLabel] = measurements;
  }

  return { sizes, errors };
}

// ─── Single-line parser (bag) ─────────────────────────────────────────────────

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

function parseSingleLine(rawText, type) {
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
    const segments = measurementStr.split('/').map(s => s.trim());
    const measurements = {};
    for (const seg of segments) {
      Object.assign(measurements, parseSegment(seg, type));
    }

    const config = TYPE_CONFIG[type];
    const missing = config.required.filter(k => !(k in measurements));
    if (missing.length > 0) {
      errors.push(`"${label}" is missing required fields: ${missing.join(', ')}`);
    }

    sizes[label] = measurements;
  }

  return { sizes, errors };
}

// ─── Main parse entry point ───────────────────────────────────────────────────

function parse(rawText, type) {
  if (TOPS_TYPES.has(type)) {
    return parseTabular(rawText, type);
  }
  return parseSingleLine(rawText, type);
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
