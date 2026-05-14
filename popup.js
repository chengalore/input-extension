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
  sweater: {
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
  top: {
    required: ['height', 'bust'],
    optional: ['waist', 'hem', 'armOpening'],
  },
  pants: {
    required: ['inseam', 'waist', 'hip', 'thigh'],
    optional: ['knee', 'legOpening', 'frontRise', 'backRise'],
  },
};

const TOPS_TYPES  = new Set(['shirt', 'tShirt', 'jacket', 'coat', 'dress', 'dressALine', 'tunicSleeve', 'sweater',  'top']);
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
  'arm opening':      'armOpening',
  'armhole':          'armOpening',
  'arm hole':         'armOpening',
  // Japanese field names
  '肩巾':  'shoulder',
  '肩幅':  'shoulder',
  'バスト': 'bust',
  '袖丈':  'sleeve_length',
  '着丈':  'height',
  'ウエスト': 'waist',
  '裾幅':  'hem',
};

// Waist priority: relaxed > stretched > generic
const WAIST_PRIORITY = ['waist$relaxed', 'waist$stretched', 'waist$other'];

// Hip priority: low hip > high hip > generic
const HIP_PRIORITY = ['hip$low', 'hip$high'];

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
const HALVE_FIELDS = new Set(['bust', 'waist', 'hem', 'hip', 'thigh', 'knee', 'legOpening', 'armOpening']);

const FIELD_DISPLAY_NAMES = {
  height: 'Length', bust: 'Bust', shoulder: 'Shoulder',
  sleeve_length: 'Sleeve length', sleeve: 'Sleeve',
  waist: 'Waist', hem: 'Hem', bicep: 'Bicep',
  inseam: 'Inseam', hip: 'Hip', thigh: 'Thigh',
  knee: 'Knee', legOpening: 'Ankle opening', armOpening: 'Arm opening',
  frontRise: 'Front rise', backRise: 'Back rise',
  width: 'Width', depth: 'Depth',
};

const TABLE_FIELD_ORDER = {
  bag:         ['height', 'width', 'depth'],
  shirt:       ['height', 'bust', 'shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem', 'bicep'],
  tShirt:      ['height', 'bust', 'shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem', 'bicep'],
  jacket:      ['height', 'bust', 'shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem', 'bicep'],
  coat:        ['height', 'bust', 'shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem', 'bicep'],
  sweater:        ['height', 'bust', 'shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem', 'bicep'],
  dress:       ['height', 'bust', 'shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem'],
  dressALine:  ['height', 'bust', 'shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem'],
  tunicSleeve: ['height', 'bust', 'shoulder', 'sleeve_length', 'sleeve', 'waist', 'hem'],
  top:         ['height', 'bust', 'waist', 'hem', 'armOpening'],
  pants:       ['inseam', 'waist', 'hip', 'thigh', 'knee', 'legOpening', 'frontRise', 'backRise'],
};

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
  // Don't trim lines before splitting — preserves leading tabs that mark an empty size-column header
  const lines = rawText.split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    return { sizes: {}, errors: ['Need at least a header row and one data row.'] };
  }

  const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
  let sizeIdx = headers.findIndex(h => h === 'size');
  if (sizeIdx === -1 && headers[0] === '') sizeIdx = 0;
  if (sizeIdx === -1) {
    // Data has one more column than headers → unlabelled size column at the start
    // (leading tab was stripped by textarea trim before reaching here)
    const firstDataCols = lines[1]?.split('\t') ?? [];
    if (firstDataCols.length === headers.length + 1) {
      headers.unshift('');
      sizeIdx = 0;
    }
  }
  if (sizeIdx === -1) {
    return { sizes: {}, errors: ['No "size" column found in header row.'] };
  }

  const colMap = TOPS_TYPES.has(type)  ? TOPS_COLUMN_MAP
               : PANTS_TYPES.has(type) ? PANTS_COLUMN_MAP
               : BAG_COLUMN_MAP;

  // Map each column index to its output field name.
  // Strip a leading "(Garment) " prefix so "(Blouse) Bust" → "bust" etc.
  const indexToField = {};
  headers.forEach((h, i) => {
    if (i === sizeIdx) return;
    const field = colMap[h] ?? colMap[h.replace(/^\([^)]+\)\s*/, '')];
    if (field && !(i in indexToField)) indexToField[i] = field;
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
      // First column wins — covers "Dress: 122 Inner camisole: 83" → 122,
      // "Before: 70 After: 73" → 70, and duplicate mapped fields like
      // "(Blouse) Length" taking priority over "(Cape) Length" for height.
      if (!(field in measurements)) measurements[field] = nums[0];
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
  // Match label then optional-whitespace : whitespace then rest
  // Handles ASCII ":" and fullwidth "："; space after colon is optional for Japanese text
  const m = line.match(/^(.+?)\s*[:：]\s*(.+)$/);
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

  // "{letter}{num}×..." with cm only at end — e.g. "H28×W15×D8cm"
  // "{letter}{num}cm" per-dimension — e.g. "W42.0cm x H35.0cm x D15.0cm"
  // "{num} cm {letter}" format — e.g. "20.5 cm H x 26 cm L x 4 cm D"
  // H=height, W=width, L=length(→width), D=depth
  if (type === 'bag') {
    const LETTER_MAP = { h: 'height', w: 'width', l: 'width', d: 'depth' };
    // Trailing-cm: cm appears only at the end (not after each number before a separator)
    if (/cm\s*$/i.test(segment) && !/\d\.?\d*\s*cm\s*[×xX]/i.test(segment)) {
      const trailingDims = [...segment.matchAll(/([WHDLwhdl])(\d+\.?\d*)/gi)];
      if (trailingDims.length > 1) {
        for (const [, letter, num] of trailingDims) {
          const field = LETTER_MAP[letter.toLowerCase()];
          if (field && !(field in result)) result[field] = parseFloat(num);
        }
        return result;
      }
    }
    const letterPrefixDims = [...segment.matchAll(/\b([WHDLwhdl])(\d+\.?\d*)\s*cm\b/g)];
    if (letterPrefixDims.length > 0) {
      for (const [, letter, num] of letterPrefixDims) {
        const field = LETTER_MAP[letter.toLowerCase()];
        if (field && !(field in result)) result[field] = parseFloat(num);
      }
      return result;
    }
    const letterDims = [...segment.matchAll(/(\d+\.?\d*)\s*cm\s+([HWLDhwld])\b/g)];
    if (letterDims.length > 0) {
      for (const [, num, letter] of letterDims) {
        const field = LETTER_MAP[letter.toLowerCase()];
        if (field && !(field in result)) result[field] = parseFloat(num);
      }
      return result;
    }
  }

  // Named tops measurements — e.g. "Shoulder width 52.5", "Dress Bust 106cm", "Length 69 (cm)"
  // Strip leading "(qualifier)" then try direct key match; if that fails, strip one leading word
  // (e.g. "Dress" / "Petticoat") and retry — longest key wins to avoid "sleeve" beating "sleeve length".
  if (TOPS_TYPES.has(type)) {
    const s = segment.replace(/^[(（][^)）]*[)）]\s*/, '').trim();
    const sl = s.toLowerCase();
    const sortedKeys = Object.keys(TOPS_COLUMN_MAP).sort((a, b) => b.length - a.length);
    const slStripped = sl.replace(/^\S+\s+/, '');
    const candidates = [{ sl, s }];
    if (slStripped !== sl) candidates.push({ sl: slStripped, s: s.slice(s.indexOf(' ') + 1) });
    for (const { sl: cSl, s: cS } of candidates) {
      for (const key of sortedKeys) {
        if (cSl.startsWith(key)) {
          const numMatch = cS.slice(key.length).match(/\d+\.?\d*/);
          if (numMatch) {
            result[TOPS_COLUMN_MAP[key]] = parseFloat(numMatch[0]);
            return result;
          }
        }
      }
    }
  }

  return result;
}

function parseSingleLine(rawText, type, takeHalf) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const sizes = {};
  const errors = [];

  for (const line of lines) {
    let split = splitLine(line);
    if (!split) {
      // No "label : measurements" colon — try parsing the whole line as ONE SIZE
      const segments = line.split('/').map(s => s.trim());
      const bare = {};
      for (const seg of segments) Object.assign(bare, parseSegment(seg, type));
      if (Object.keys(bare).length > 0) {
        const missing = TYPE_CONFIG[type].required.filter(k => !(k in bare));
        if (missing.length) errors.push(`"ONE SIZE" is missing required fields: ${missing.join(', ')}`);
        sizes['ONE SIZE'] = bare;
      } else {
        errors.push(`Could not parse line: "${line}"`);
      }
      continue;
    }
    const [label, measurementStr] = split;
    const segments = measurementStr.split(/[/,、]/).map(s => s.trim()).filter(Boolean);
    const measurements = {};
    for (const seg of segments) {
      for (const [k, v] of Object.entries(parseSegment(seg, type))) {
        if (!(k in measurements)) measurements[k] = v;
      }
    }
    normalizeMeasurements(measurements, takeHalf);
    computeSleeve(measurements);

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
function matchGradedField(desc, altDesc = '', type = '') {
  // Strip leading "½" or "1/2" prefix — these spec sheets store pre-halved values
  const d = desc.toLowerCase().replace(/^(?:½|1\/2)\s*/, '');
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
  if (/(arm\s*(hole|opening)|armhole)/.test(d)) return 'armOpening';

  // Hip (and seat as synonym) — checked BEFORE waist because descriptions like
  // "High Hip @ below waist edge" contain "waist" as a reference point
  if (/(\bhip\b|\bseat\b)/.test(d) && !/position/.test(d)) {
    if (/\blow\b/.test(d)) return 'hip$low';
    return 'hip$high';
  }

  // Waist — tagged for priority: relaxed > stretched > generic
  // Exclude waistband, position measurements, and horizontal width measurements
  if (/waist/.test(d) && !/band|position|pocket|horizontal|\bto\s+waist\b/.test(d)) {
    if (/relax/.test(d)) return 'waist$relaxed';
    if (/stretch/.test(d)) return 'waist$stretched';
    return 'waist$other';
  }

  // Pants circumferences — check before generic hem to avoid legOpening → hem
  if (/\bthigh\b/.test(d)) return 'thigh';
  if (/\bknee\b/.test(d)) return 'knee';
  if (/(leg\s*(bottom|opening))/.test(d)) return 'legOpening';

  // Bottom width — leg opening for pants, hem for tops
  if (/bottom width/.test(d) && !/sleeve/.test(d)) {
    return PANTS_TYPES.has(type) ? 'legOpening' : 'hem';
  }

  // Pants lengths
  if (/\boutseam\b/.test(d)) return null;
  if (/\b(inseam|inleg)\b/.test(d)) {
    // Tag with the inch length when present (e.g. "Inseam 28"" → _inseamLen_28)
    const lenMatch = d.match(/(\d+)/);
    return lenMatch ? `_inseamLen_${lenMatch[1]}` : 'inseam';
  }

  // Waistband height/depth — stored internally, used to adjust rise if needed
  if (/waistband/.test(d) && /(height|depth)/.test(d)) return '_waistband';

  // Front/back rise — tag by whether waistband is included
  if (/front\s*rise/.test(d)) {
    const inclWB = /incl\.?\s*wb|incl\.?\s*waist.?band|from waist edge/.test(a)
                || /incl\.?\s*wb|from waist edge/.test(d);
    return inclWB ? 'frontRise$incl' : 'frontRise$excl';
  }
  if (/back.?rise/.test(d)) {
    const inclWB = /incl\.?\s*wb|incl\.?\s*waist.?band|from waist edge/.test(a)
                || /incl\.?\s*wb|from waist edge/.test(d);
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

// Excel TSV copies multi-line cell values as "first line\nsecond line" with surrounding quotes.
// Only match " at a field boundary (after \t or at line start) so mid-field inch marks like
// "Inseam 28"" don't start a runaway match consuming adjacent columns.
// RFC 4180: "" inside a quoted cell is an escaped quote.
function normalizeQuotedTSV(text) {
  return text.replace(/(^|\t)"((?:[^"]|"")*)"/gm, (_, prefix, inner) => {
    return prefix + (inner.replace(/""/g, '"').split('\n').map(s => s.trim()).find(Boolean) ?? '');
  });
}

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

function expandInseamCombinations(sizes) {
  const inseamKeys = new Set();
  for (const m of Object.values(sizes)) {
    for (const k of Object.keys(m)) {
      if (k.startsWith('_inseamLen_')) inseamKeys.add(k);
    }
  }
  if (inseamKeys.size === 0) return sizes;

  // Sort inseam lengths numerically (28, 30, 32, …)
  const inseamLens = [...inseamKeys].sort((a, b) => parseInt(a.slice(11)) - parseInt(b.slice(11)));

  const expanded = {};
  for (const [waist, m] of Object.entries(sizes)) {
    for (const lenKey of inseamLens) {
      if (!(lenKey in m)) continue;
      const comboKey = `${waist}/${lenKey.slice(11)}`;
      const combo = {};
      for (const [k, v] of Object.entries(m)) {
        if (!k.startsWith('_inseamLen_')) combo[k] = v;
      }
      combo.inseam = m[lenKey];
      expanded[comboKey] = combo;
    }
  }
  return expanded;
}

function parseGraded(rawText, type, takeHalf) {
  const lines = normalizeQuotedTSV(rawText).split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { sizes: {}, errors: ['Need header + data rows.'] };

  // Skip title rows — find the first line that looks like a spec header
  let headerLineIdx = 0;
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const cols = lines[i].split('\t').map(h => h.trim());
    if (cols.some(h => /^[Ww]?\d+$/.test(h) || /^(description|pom|measuring|point\s*of\s*measure|code|dim|ref)/i.test(h))) {
      headerLineIdx = i;
      break;
    }
  }
  const headers = lines[headerLineIdx].split('\t').map(h => h.trim());
  const dataStartIdx = headerLineIdx + 1;

  // Find description column, fallback to index 1
  const descIdx = (() => {
    const i = headers.findIndex(h =>
      /^description$/i.test(h) || /^pom\s*name$/i.test(h) ||
      /^measuring\s*point$/i.test(h) || /^point\s*of\s*measure$/i.test(h)
    );
    return i !== -1 ? i : 1;
  })();

  // Find alt-description column for incl./excl. WB annotations
  const descAltIdx = headers.findIndex(h => /description.*(alt|\(alt\))/i.test(h));

  // Size columns: any non-empty header that isn't the POM/code, description,
  // alt-description, or tolerance column. Handles numeric (32, W24) and text (XS, S/XS) sizes.
  const sizeCols = headers.reduce((acc, h, i) => {
    if (i === 0) return acc;                              // skip POM/code column
    if (i === descIdx) return acc;                        // skip description column
    if (descAltIdx >= 0 && i === descAltIdx) return acc; // skip alt description
    if (!h || /^tol/i.test(h) || !/[A-Za-z0-9]/.test(h)) return acc; // skip empty/tol/symbols
    // Skip columns whose header looks like a code or description label, not a size
    if (/^(pom|code|ref|dim|desc|meas|point)/i.test(h)) return acc;
    const num = h.match(/^[Ww]?(\d+)$/);
    acc.push({ i, size: num ? num[1] : h });
    return acc;
  }, []);

  if (sizeCols.length === 0) return { sizes: {}, errors: ['No size columns found.'] };

  const sizes = {};
  for (const { size } of sizeCols) sizes[size] = {};

  for (let r = dataStartIdx; r < lines.length; r++) {
    const cols = lines[r].split('\t').map(c => c.trim());
    const desc    = cols[descIdx] ?? '';
    const altDesc = descAltIdx >= 0 ? (cols[descAltIdx] ?? '') : '';
    const field = matchGradedField(desc, altDesc, type);
    if (!field) continue;

    for (const { i, size } of sizeCols) {
      const val = parseFloat((cols[i] ?? '').replace(',', '.'));
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

    // Resolve hip: low > high
    for (const key of HIP_PRIORITY) {
      if (key in m) { m.hip = m[key]; break; }
    }
    for (const key of HIP_PRIORITY) delete m[key];

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

  return { sizes: expandInseamCombinations(sizes), errors: [] };
}

// ─── Main parse entry point ───────────────────────────────────────────────────

function isGradedFormat(rawText) {
  const lines = normalizeQuotedTSV(rawText).trim().split('\n').slice(0, 3).map(l => l.toLowerCase().trim());
  return lines.some(l =>
    l.startsWith('dim\t') || l.startsWith('ref\t') || l.startsWith('code\t') ||
    /^pom\s*(code|name)?\t/.test(l)
  );
}

function isTabularFormat(rawText) {
  const firstLine = rawText.trim().split('\n')[0].toLowerCase().trim();
  return firstLine.startsWith('size\t') || firstLine === 'size';
}

function isSingleLineFormat(rawText) {
  const firstLine = rawText.trim().split('\n')[0];
  return !firstLine.includes('\t') && splitLine(firstLine) !== null;
}

function parse(rawText, type, takeHalf) {
  if (isGradedFormat(rawText)) return parseGraded(rawText, type, takeHalf);
  if (isSingleLineFormat(rawText)) return parseSingleLine(rawText, type, takeHalf);
  if (TOPS_TYPES.has(type) || PANTS_TYPES.has(type) || isTabularFormat(rawText)) return parseTabular(rawText, type, takeHalf);
  return parseSingleLine(rawText, type, takeHalf);
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function toOutputJSON(sizes, type) {
  const inner = JSON.stringify({ sizes, type }, null, 2);
  // Strip the outer { } so the output is a pasteable object fragment
  return inner.slice(2, -2).replace(/^  /mg, '');
}

function toOutputTable(sizes, type) {
  const fields = TABLE_FIELD_ORDER[type] ?? [];
  const sizeNames = Object.keys(sizes);
  const activeFields = fields.filter(f => sizeNames.some(s => f in sizes[s]));
  const header = ['Size name', ...activeFields.map(f => FIELD_DISPLAY_NAMES[f] ?? f)].join('\t');
  const rows = sizeNames.map(name => {
    const m = sizes[name];
    return [name, ...activeFields.map(f => f in m ? m[f] : '')].join('\t');
  });
  return [header, ...rows].join('\n');
}

// ─── UI ───────────────────────────────────────────────────────────────────────

const parseBtn  = document.getElementById('parse-btn');
const halfBtn   = document.getElementById('half-btn');
const tableBtn  = document.getElementById('table-btn');
const copyBtn   = document.getElementById('copy-btn');
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

let tableMode = false;
tableBtn.addEventListener('click', () => {
  tableMode = !tableMode;
  tableBtn.classList.toggle('active', tableMode);
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

  outputPre.textContent = tableMode ? toOutputTable(sizes, type) : toOutputJSON(sizes, type);
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
