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
  dressALine: {
    required: ['height', 'bust'],
    optional: ['shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem'],
  },
  tunicSleeve: {
    required: ['height', 'bust'],
    optional: ['shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem'],
  },
  pants: {
    required: ['inseam', 'waist', 'hip', 'thigh'],
    optional: ['knee', 'legOpening', 'frontRise', 'backRise'],
  },
};

const TOPS_TYPES  = new Set(['shirt', 'tShirt', 'jacket', 'coat', 'dress', 'dressALine', 'tunicSleeve']);
const PANTS_TYPES = new Set(['pants']);

// Column header (lowercase) → output field name, for bags
const BAG_COLUMN_MAP = {
  'width':    'width',
  'height':   'height',
  'depth':    'depth',
  'machi':    'depth',   // Japanese term for gusset/depth
  'thickness':'depth',
  'length':   'height',
};

// Column header (lowercase) → output field name, for tops
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
  'sleeve length':        'sleeve_length',
  'sleeve':               'sleeve',
  'raglan sleeve':        '_raglanSleeve',
  'raglan sleeve length': '_raglanSleeve',
  'neck width':           '_neckWidth',
  'waist':            'waist',
  'waist width':      'waist',
  'hem':              'hem',
  'hem width':        'hem',
  'bicep':            'bicep',
};

// Waist priority: relaxed > stretched > generic
const WAIST_PRIORITY = ['waist$relaxed', 'waist$stretched', 'waist$other'];

// Column header (lowercase) → output field name, for pants (tabular format)
const PANTS_COLUMN_MAP = {
  'waist':            'waist',
  'waist relaxed':    'waist',
  'hip':              'hip',
  'thigh':            'thigh',
  'inseam':           'inseam',
  'knee':             'knee',
  'leg opening':      'legOpening',
  'leg bottom width': 'legOpening',
  'front rise':       'frontRise',
  'back rise':        'backRise',
};

// ─── Measurement normalization ────────────────────────────────────────────────

// Fields eligible for "take half" — stores original as {field}_round
const HALVE_FIELDS = new Set(['bust', 'waist', 'hem', 'hip', 'thigh', 'knee', 'legOpening']);

function normalizeMeasurements(measurements, takeHalf) {
  if (!takeHalf) return;
  for (const field of HALVE_FIELDS) {
    if (field in measurements) {
      measurements[`${field}_round`] = measurements[field];
      measurements[field] = measurements[field] / 2;
    }
  }
}

// ─── Tabular parser (shirt / tShirt / jacket / coat) ─────────────────────────

function extractNumbers(str) {
  return [...str.matchAll(/[\d.]+/g)].map(m => parseFloat(m[0]));
}

function parseTabular(rawText, type, takeHalf) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { sizes: {}, errors: ['Need at least a header row and one data row.'] };
  }

  const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
  const sizeIdx = headers.findIndex(h => h === 'size');
  if (sizeIdx === -1) {
    return { sizes: {}, errors: ['No "size" column found in header row.'] };
  }

  const colMap = TOPS_TYPES.has(type)  ? TOPS_COLUMN_MAP
               : PANTS_TYPES.has(type) ? PANTS_COLUMN_MAP
               : BAG_COLUMN_MAP;

  // Map each column index to its output field name
  const indexToField = {};
  headers.forEach((h, i) => {
    if (i === sizeIdx) return;
    const field = colMap[h];
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

    normalizeMeasurements(measurements, takeHalf);

    computeSleeve(measurements);

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

function parseSingleLine(rawText, type, takeHalf) {
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

// ─── Graded measurement parser (Excel spec sheet: sizes as columns) ──────────

// Height priority tags — resolved after all rows are processed
// Priority: HPS+CB > HPS > CB > CF > other
const HEIGHT_PRIORITY = ['height$hps_cb', 'height$hps', 'height$full', 'height$cb', 'height$cf', 'height$other'];

// Map description + alt-description → output field. Order matters: specific first.
function matchGradedField(desc, altDesc = '') {
  const d = desc.toLowerCase();
  const a = altDesc.toLowerCase();

  // Raglan sleeve — before standard sleeve checks
  if (/raglan.*sleeve|sleeve.*raglan/.test(d)) return '_raglanSleeve';
  // Neck width — stored internally for raglan total sleeve computation
  if (/\bneck\s*(width|opening)\b/.test(d)) return '_neckWidth';

  // Tops: sleeve
  if (/sleeve length from (shoulder|shoulder seam)/.test(d)) return 'sleeve_length';
  if (/sleeve length from (cb|centre back|center back)/.test(d)) return 'sleeve';
  if (/(across shoulder|shoulder across|shoulder width)/.test(d)) return 'shoulder';
  if (/(chest|bust)/.test(d) && !/pocket/.test(d)) return 'bust';
  if (/(bicep|upper sleeve width)/.test(d)) return 'bicep';

  // Waist — tagged for priority: relaxed > stretched > generic
  // Exclude waistband, position measurements, and horizontal width measurements
  if (/waist/.test(d) && !/band|position|pocket|horizontal/.test(d)) {
    if (/relax/.test(d)) return 'waist$relaxed';
    if (/stretch/.test(d)) return 'waist$stretched';
    return 'waist$other';
  }

  // Pants circumferences — check before generic hem to avoid legOpening → hem
  if (/\bhip\b/.test(d) && !/position/.test(d)) return 'hip';
  if (/\bthigh\b/.test(d)) return 'thigh';
  if (/\bknee\b/.test(d)) return 'knee';
  if (/(leg\s*(bottom|opening))/.test(d)) return 'legOpening';

  // Tops: hem (after leg check so "leg bottom width" doesn't match here)
  if (/bottom width/.test(d) && !/sleeve/.test(d)) return 'hem';

  // Pants lengths
  if (/\boutseam\b/.test(d)) return null;
  if (/\binseam\b/.test(d)) return 'inseam';

  // Waistband height — stored internally, used to adjust rise if needed
  if (/waistband/.test(d) && /height/.test(d)) return '_waistband';

  // Front/back rise — tag by whether waistband is included
  if (/front\s*rise/.test(d)) {
    const inclWB = /incl\.?\s*wb|incl\.?\s*waist.?band/.test(a) || /incl\.?\s*wb/.test(d);
    return inclWB ? 'frontRise$incl' : 'frontRise$excl';
  }
  if (/back\s*rise/.test(d)) {
    const inclWB = /incl\.?\s*wb|incl\.?\s*waist.?band/.test(a) || /incl\.?\s*wb/.test(d);
    return inclWB ? 'backRise$incl' : 'backRise$excl';
  }

  // Height — tag by reference for priority resolution
  if (/length/.test(d)) {
    const hasHps = /from (hps|highest point shoulder)/.test(d);
    const hasCb  = /(cb|centre back|center back|\bback\b)/.test(d);
    const hasCf  = /(cf|centre front|center front|\bfront\b)/.test(d);
    if (hasHps && hasCb) return 'height$hps_cb';
    if (hasHps)          return 'height$hps';
    if (hasCb)           return 'height$cb';
    if (hasCf)           return 'height$cf';
    if (/(full|body|total) length/.test(d)) return 'height$full';
  }

  return null;
}

const RISE_TAGS = ['frontRise$incl', 'frontRise$excl', 'backRise$incl', 'backRise$excl'];

// Sleeve computation — raglan takes priority over standard shoulder + sleeve_length
function computeSleeve(m) {
  if ('_raglanSleeve' in m) {
    // Raglan: total sleeve = raglan measurement + half neck width
    m.sleeve = m._raglanSleeve + ('_neckWidth' in m ? m._neckWidth / 2 : 0);
  } else if ('shoulder' in m && 'sleeve_length' in m && !('sleeve' in m)) {
    // Standard: sleeve from CB = half shoulder + sleeve_length
    m.sleeve = m.shoulder / 2 + m.sleeve_length;
  }
  delete m._raglanSleeve;
  delete m._neckWidth;
}

function parseGraded(rawText, type, takeHalf) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { sizes: {}, errors: ['Need header + data rows.'] };

  const headers = lines[0].split('\t').map(h => h.trim());

  // Find description column ("Description" or "POM Name"), fallback to index 1
  const descIdx = (() => {
    const i = headers.findIndex(h => /^description$/i.test(h) || /^pom\s*name$/i.test(h));
    return i !== -1 ? i : 1;
  })();

  // Find alt-description column ("Description (Alt)" etc.) for incl./excl. WB annotations
  const descAltIdx = headers.findIndex(h => /description.*(alt|\(alt\))/i.test(h));

  // Size columns = headers that are plain integers (32, 34, 42, 44, …)
  const sizeCols = headers.reduce((acc, h, i) => {
    if (/^\d+$/.test(h)) acc.push({ i, size: h });
    return acc;
  }, []);

  if (sizeCols.length === 0) return { sizes: {}, errors: ['No size columns (numeric headers) found.'] };

  const sizes = {};
  for (const { size } of sizeCols) sizes[size] = {};

  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r].split('\t').map(c => c.trim());
    const desc    = cols[descIdx] ?? '';
    const altDesc = descAltIdx >= 0 ? (cols[descAltIdx] ?? '') : '';
    const field = matchGradedField(desc, altDesc);
    if (!field) continue;

    for (const { i, size } of sizeCols) {
      const val = parseFloat(cols[i]);
      if (!isNaN(val) && !(field in sizes[size])) {
        sizes[size][field] = val;
      }
    }
  }

  for (const m of Object.values(sizes)) {
    // Resolve waist: relaxed > stretched > generic
    for (const key of WAIST_PRIORITY) {
      if (key in m) { m.waist = m[key]; break; }
    }
    for (const key of WAIST_PRIORITY) delete m[key];

    normalizeMeasurements(m, takeHalf);

    // Resolve front/back rise — add waistband height when measurement excludes it
    const wb = m._waistband ?? 0;
    delete m._waistband;
    if ('frontRise$incl' in m) m.frontRise = m['frontRise$incl'];
    else if ('frontRise$excl' in m) m.frontRise = m['frontRise$excl'] + wb;
    if ('backRise$incl' in m)  m.backRise  = m['backRise$incl'];
    else if ('backRise$excl' in m)  m.backRise  = m['backRise$excl'] + wb;
    for (const key of RISE_TAGS) delete m[key];

    // Resolve height: pick highest-priority tagged variant
    for (const key of HEIGHT_PRIORITY) {
      if (key in m) { m.height = m[key]; break; }
    }
    for (const key of HEIGHT_PRIORITY) delete m[key];

    computeSleeve(m);
  }

  return { sizes, errors: [] };
}

// ─── Main parse entry point ───────────────────────────────────────────────────

function isGradedFormat(rawText) {
  const first = rawText.trim().split('\n')[0].toLowerCase().trim();
  return first.startsWith('dim\t') || /^pom\s*(code|name)?\t/.test(first);
}

function isTabularFormat(rawText) {
  const firstLine = rawText.trim().split('\n')[0].toLowerCase().trim();
  return firstLine.startsWith('size\t') || firstLine === 'size';
}

function parse(rawText, type, takeHalf) {
  if (isGradedFormat(rawText)) return parseGraded(rawText, type, takeHalf);
  if (TOPS_TYPES.has(type) || PANTS_TYPES.has(type) || isTabularFormat(rawText)) return parseTabular(rawText, type, takeHalf);
  return parseSingleLine(rawText, type, takeHalf);
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function toOutputJSON(sizes, type) {
  const inner = JSON.stringify({ sizes, type }, null, 2);
  // Strip the outer { } so the output is a pasteable object fragment
  return inner.slice(2, -2).replace(/^  /mg, '');
}

// ─── UI ───────────────────────────────────────────────────────────────────────

const parseBtn = document.getElementById('parse-btn');
const halfBtn  = document.getElementById('half-btn');
const copyBtn  = document.getElementById('copy-btn');
const inputText = document.getElementById('input-text');
const typeSelect = document.getElementById('type-select');
const outputSection = document.getElementById('output-section');
const outputPre = document.getElementById('output');
const errorMsg = document.getElementById('error-msg');

let takeHalf = false;
halfBtn.addEventListener('click', () => {
  takeHalf = !takeHalf;
  halfBtn.classList.toggle('active', takeHalf);
});

parseBtn.addEventListener('click', () => {
  const raw = inputText.value.trim();
  const type = typeSelect.value;

  errorMsg.classList.add('hidden');
  outputSection.classList.add('hidden');

  if (!raw) {
    showError('Paste measurement text first.');
    return;
  }

  const { sizes, errors } = parse(raw, type, takeHalf);

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
