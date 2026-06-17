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
    optional: ['waist', 'hem', 'armOpening', 'shoulder'],
  },
  skirt: {
    required: ['height', 'waist'],
    optional: ['hip', 'hem'],
  },
  pants: {
    required: ['inseam', 'waist', 'hip', 'thigh'],
    optional: ['knee', 'legOpening', 'frontRise', 'backRise'],
  },
};

const TOPS_TYPES  = new Set(['shirt', 'tShirt', 'jacket', 'coat', 'dress', 'dressALine', 'tunicSleeve', 'sweater', 'top', 'skirt']);
const PANTS_TYPES = new Set(['pants']);

// Column header (lowercase) → output field name, for bags
const BAG_COLUMN_MAP = {
  'width':      'width',
  'beside':     'width',
  'height':     'height',
  'vertical':   'height',
  'depth':      'depth',
  'machi':      'depth',
  'thickness':  'depth',
  'town':       'depth',  // English translation of Japanese "machi" (gusset/depth)
  'length':     'height',
  // Japanese bag field names
  '横':    'width',
  '幅':    'width',
  '高さ':  'height',
  '奥行':  'depth',
  '奥行き': 'depth',
  'まち':  'depth',  // hiragana for machi (gusset)
};

// Column header (lowercase) → output field name, for tops
const TOPS_COLUMN_MAP = {
  'height':           'height',
  'length':           'height',
  'total':            'height',
  'total length':     'height',
  'back length':      'height',
  'body length':      'height',
  'shoulder width':   'shoulder',
  'shoulder':         'shoulder',
  'body width':       'bust',
  'chest width':      'bust',
  'chest':            'bust',
  'bust':             'bust',
  'bust size':        'bust',
  'bust width':       'bust',
  'width':            'bust',
  'sleeve length':        'sleeve_length',
  'yuki':                 'sleeve_length',
  'yukitake':             'sleeve_length',
  'ゆき':                 'sleeve_length',
  'ゆき丈':              'sleeve_length',
  'sleeve':               'sleeve',
  'raglan sleeve':        '_raglanSleeve',
  'raglan sleeve length': '_raglanSleeve',
  'neck width':           '_neckWidth',
  'waist':            'waist',
  'waist width':      'waist',
  'hip':              'hip',
  'hips':             'hip',
  'hem':              'hem',
  'hem width':        'hem',
  'sleeve width':     'bicep',
  'bicep':            'bicep',
  'arm opening':      'armOpening',
  'armhole':          'armOpening',
  'arm hole':         'armOpening',
  // Japanese field names
  '肩巾':  'shoulder',
  '肩幅':  'shoulder',
  'バスト': 'bust',
  '身幅':   'bust',
  '袖丈':  'sleeve_length',
  '着丈':  'height',
  '身丈':  'height',
  'ウエスト': 'waist',
  '裾幅':  'hem',
  // Korean field names
  '앞총장': 'height',
  '뒤총장': 'height',
  '어깨너비': 'shoulder',
  '소매길이': 'sleeve_length',
  '래글런 소매길이': '_raglanSleeve',
  '소매통': 'bicep',
  '가슴둘레': 'bust',
  '허리둘레': 'waist',
  '밑단둘레': 'hem',
  '힙둘레': 'hip',
  // Spec-sheet / tech-pack verbose descriptions (e.g. Acne Studios, POM sheets)
  'low hip':                'hip',
  'low hip position':       'hip',
  'bottom width':           'hem',
  'skirt cf length':        'height',
  'skirt cb length':        'height',
  'skirt side seam length': 'height',
  'skirt length':           'height',
  'front length':           'height',
  'across shoulder':        'shoulder',
  'shoulder lenght':        'shoulder',   // common typo in brand spec sheets
};

// Waist priority: relaxed > stretched > generic
const WAIST_PRIORITY = ['waist$relaxed', 'waist$stretched', 'waist$other'];

// Hip priority: low hip > high hip > generic
const HIP_PRIORITY = ['hip$low', 'hip$high'];

// Column header (lowercase) → output field name, for pants (tabular format)
const PANTS_COLUMN_MAP = {
  'waist':             'waist',
  'waist relaxed':     'waist',
  'waist (elastic)':   'waist',
  'waist elastic':     'waist',
  'suitable waist':    'waist',
  'hip':               'hip',
  'hips':              'hip',
  'suitable hip':      'hip',
  'suitable hips':     'hip',
  'thigh':             'thigh',
  'watari':            'thigh',
  'inseam':            'inseam',
  'knee':              'knee',
  'leg opening':       'legOpening',
  'leg bottom width':  'legOpening',
  'hem width':         'legOpening',
  'rise':              'frontRise',
  'front rise':        'frontRise',
  'back rise':         'backRise',
  // Japanese pants field names (half-width katakana + kanji)
  'ｳｴｽﾄ':             'waist',
  'ｳｴｽﾄ（ﾇーﾄﾞ寸法）': 'waist',
  'ｳｴｽﾄ（仕上り寸法）': 'waist',
  'ﾋｯﾌﾟ':             'hip',
  '股下':              'inseam',
  '前股上':            'frontRise',
  '渡り幅':            'thigh',
  '裾幅':              'legOpening',
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
  skirt:       ['height', 'waist', 'hip', 'hem'],
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

// ─── TSV parser (handles quoted multi-line cells) ────────────────────────────
// When copying from Excel/Sheets, cells with newlines are wrapped in quotes.
// This parser keeps only the first line of each quoted multi-line cell,
// so "XS/XXS\nXXS" becomes "XS/XXS" (the display label, not the alternate).

function parseTSVLines(rawText) {
  // Parses tab-separated values, handling quoted multi-line cells.
  // Keeps up to two lines of each quoted cell (separated by \n in the returned value)
  // so the caller can pick the better label (e.g. "XS/XXS" over "XXS").
  const rows = [];
  let row = [];
  let cell = '';
  let inQuote = false;
  let newlineCount = 0;   // how many embedded \n seen in current quoted cell

  for (let i = 0; i < rawText.length; i++) {
    const ch = rawText[i];
    if (inQuote) {
      if (ch === '"') {
        if (rawText[i + 1] === '"') { cell += '"'; i++; }  // escaped ""
        else { inQuote = false; newlineCount = 0; }          // end of quoted cell
      } else if (newlineCount < 2) {
        if (ch === '\n') {
          if (newlineCount === 0) cell += '\n';  // store line separator; skip subsequent \n
          newlineCount++;
        } else {
          cell += ch;
        }
      }
      // newlineCount >= 2: skip remaining content until closing "
    } else {
      if (ch === '"' && cell === '') { inQuote = true; }
      else if (ch === '\t') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else { cell += ch; }
    }
  }
  row.push(cell);
  if (row.some(c => c)) rows.push(row);
  return rows;
}

// ─── POM spec-sheet parser ───────────────────────────────────────────────────
// "POM" (Point of Measure) sheets: col 0 = measurement description,
// cols 1-N = one value per size. The header row has "POM" as col 0,
// size labels (XS/XXS, S/XS, M/S, ...) in cols 1-N.

function tryParsePomSheet(rows, type, takeHalf) {
  const pomRowIdx = rows.findIndex(r => (r[0] ?? '').trim().toUpperCase() === 'POM');
  if (pomRowIdx < 0) return null;

  let headerRow = rows[pomRowIdx];
  let dataStartIdx = pomRowIdx + 1;

  // When a spreadsheet's multi-line header cells are pasted without quotes, each
  // embedded newline becomes a real row break. The POM row then has only 2 cells
  // (POM + first-line of first size label), followed by continuation rows where
  // cell[0] is the alt label (second line) and cell[1] is the first-line of the
  // next size. Collect these until we hit an actual data row (many cells).
  if (headerRow.length <= 2) {
    const collected = headerRow.slice(1).map(s => s.trim()).filter(Boolean);
    while (dataStartIdx < rows.length) {
      const r = rows[dataStartIdx];
      if (r.length > 3) break;             // data rows have many cols — stop
      if (r[1] !== undefined) collected.push(r[1].trim());
      dataStartIdx++;
    }
    headerRow = ['POM', ...collected];
  }

  // For multi-line header cells (stored as "line1\nline2"), prefer the line that
  // contains '/' — that's the composite size label (e.g. "XS/XXS" beats "XXS").
  const pickLabel = s => {
    const lines = s.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.find(l => l.includes('/')) ?? lines[0] ?? '';
  };
  const sizeLabels = headerRow.slice(1).map(s => pickLabel(s)).filter(Boolean);
  if (sizeLabels.length < 2) return null;

  const colMap = TOPS_TYPES.has(type) ? TOPS_COLUMN_MAP
               : PANTS_TYPES.has(type) ? PANTS_COLUMN_MAP
               : BAG_COLUMN_MAP;

  // When pasted unquoted, alt labels (XXS, XS, S…) land in the header row (first line of cells)
  // and composite labels (XS/XXS, S/XS, M/S…) appear in the very next row.
  // The header row has length > 2 so the fragmented path doesn't apply; the composite row then
  // gets treated as data and silently skipped. Detect it: if the row right after the header has
  // '/' in non-first cells but no measurement field in col 0, treat it as composite-labels and
  // upgrade any plain label with the composite version.
  if (dataStartIdx < rows.length) {
    const nextRow = rows[dataStartIdx];
    const col0 = (nextRow[0] ?? '').trim().toLowerCase();
    const nextCols = nextRow.slice(1);
    const hasComposite = nextCols.some(c => (c ?? '').includes('/'));
    const noMeasField = !col0 || !colMap[col0];
    if (hasComposite && noMeasField) {
      for (let i = 0; i < sizeLabels.length; i++) {
        const candidate = (nextCols[i] ?? '').trim();
        if (candidate.includes('/') && !sizeLabels[i].includes('/')) sizeLabels[i] = candidate;
      }
      dataStartIdx++;
    }
  }

  const sizes = {};
  const errors = [];
  for (const s of sizeLabels) sizes[s] = {};

  for (let i = dataStartIdx; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 2) continue;

    const desc = (cols[0] ?? '').trim();
    const descNorm = desc.toLowerCase()
      .replace(/\s*\*\s*$/g, '')           // trailing * annotation (e.g. "Chest *")
      .replace(/\s*\([^)]*\)/g, '')        // (from HPS), (long), (2cm below armhole)
      .replace(/\s+incl\.?\b.*/i, '')      // "incl. Rib/trim at bottom"
      .replace(/\s+from\b.*/i, '')         // "from CB"
      .replace(/\s+extended\b.*/i, '')     // "extended, 2cm above rib/trim"
      .replace(/,.*$/, '')                 // everything after comma
      .trim();

    const field = colMap[descNorm]
      ?? colMap[descNorm.replace(/^(?:skirt|pant|pants|top|jacket|coat|dress|front|back|across)\s+/i, '').trim()];
    if (!field || field.startsWith('_')) continue;

    const valueCells = cols.slice(1);
    sizeLabels.forEach((size, si) => {
      const val = parseFloat((valueCells[si] ?? '').replace(',', '.'));
      if (!isNaN(val) && !(field in sizes[size])) sizes[size][field] = val;
    });
  }

  for (const [sizeLabel, measurements] of Object.entries(sizes)) {
    if (Object.keys(measurements).length === 0) { delete sizes[sizeLabel]; continue; }
    normalizeMeasurements(measurements, takeHalf);
    computeSleeve(measurements);
    const missing = TYPE_CONFIG[type].required.filter(k => !(k in measurements));
    if (missing.length) errors.push(`"${sizeLabel}" is missing required fields: ${missing.join(', ')}`);
  }

  if (Object.keys(sizes).length === 0) return null;
  return { sizes, errors };
}

// ─── Spec-sheet parser (brand tech-pack / grading table) ─────────────────────
// Handles transposed tables where: rows = measurements, columns = sizes.
// Detection: a line with >= 3 pure-integer tab cells, with "description" in a nearby preceding line.
// The dim code (e.g. BW005) is col 0; the human description is col 1; size values are the last N cols.

function tryParseSpecSheet(lines, type, takeHalf) {
  let sizeLabelLineIdx = -1;
  let sizeLabels = [];

  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split('\t').map(c => c.trim());
    const intCells = cells.filter(c => /^\d+$/.test(c));
    if (intCells.length < 3) continue;
    const windowStart = Math.max(0, i - 2);
    const nearby = lines.slice(windowStart, i + 1);
    const hasDesc = nearby.some(l =>
      l.split('\t').map(c => c.trim().toLowerCase()).includes('description')
    );
    if (hasDesc) {
      sizeLabelLineIdx = i;
      sizeLabels = intCells;
      break;
    }
  }
  if (sizeLabelLineIdx < 0) return null;

  const colMap = TOPS_TYPES.has(type) ? TOPS_COLUMN_MAP
               : PANTS_TYPES.has(type) ? PANTS_COLUMN_MAP
               : BAG_COLUMN_MAP;

  const sizes = {};
  const errors = [];
  for (const s of sizeLabels) sizes[s] = {};
  const numSizes = sizeLabels.length;

  for (let i = sizeLabelLineIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split('\t').map(c => c.trim());
    if (cols.length < numSizes + 1) continue;
    const valueCells = cols.slice(cols.length - numSizes);
    if (!valueCells.some(c => /\d/.test(c))) continue;

    const desc = cols[1] ?? '';
    const descNorm = desc.toLowerCase()
      .replace(/\s*\*[^*]*\*/g, '')  // strip *BOTTOMS* style annotations
      .replace(/\s*\([^)]*\)/g, '')  // strip (mini), (measured along hem), etc.
      .trim();

    const field = colMap[descNorm]
      ?? colMap[descNorm.replace(/^(?:skirt|pant|pants|top|jacket|coat|dress)\s+/i, '').trim()]
      ?? colMap[descNorm.replace(/\s+(?:cf|cb|side seam)\b.*/i, '').trim()];
    if (!field) continue;

    sizeLabels.forEach((size, si) => {
      const val = parseFloat(valueCells[si].replace(',', '.'));
      if (!isNaN(val) && !(field in sizes[size])) sizes[size][field] = val;
    });
  }

  for (const [sizeLabel, measurements] of Object.entries(sizes)) {
    if (Object.keys(measurements).length === 0) { delete sizes[sizeLabel]; continue; }
    normalizeMeasurements(measurements, takeHalf);
    computeSleeve(measurements);
    const missing = TYPE_CONFIG[type].required.filter(k => !(k in measurements));
    if (missing.length) errors.push(`"${sizeLabel}" is missing required fields: ${missing.join(', ')}`);
  }

  if (Object.keys(sizes).length === 0) return null;
  return { sizes, errors };
}

// ─── Tabular parser (shirt / tShirt / jacket / coat) ─────────────────────────

const TEXT_NUMS = {
  zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,
  ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,
  sixteen:16,seventeen:17,eighteen:18,nineteen:19,
  twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,
};

function parseTextNumber(str) {
  const words = str.trim().toLowerCase().split(/[\s-]+/);
  if (words.length === 0 || words.some(w => !(w in TEXT_NUMS))) return null;
  return words.reduce((sum, w) => sum + TEXT_NUMS[w], 0) || null;
}

function extractNumbers(str) {
  const digits = [...str.matchAll(/[\d.]+/g)].map(m => parseFloat(m[0]));
  if (digits.length > 0) return digits;
  const t = parseTextNumber(str);
  return t !== null ? [t] : [];
}

function parseTabular(rawText, type, takeHalf) {
  // Parse TSV with quoted multi-line cells ("XS/XXS\nXXS" → 'XS/XXS')
  const tsvRows = parseTSVLines(rawText);

  // POM spec-sheet: header row has "POM" as first cell
  const pomResult = tryParsePomSheet(tsvRows, type, takeHalf);
  if (pomResult) return pomResult;

  // Reconvert TSV rows to tab-joined lines for the rest of the logic.
  // Don't trim — preserves leading tabs that mark an empty size-column header.
  let lines = tsvRows.map(r => r.join('\t')).filter(l => l.trim());
  if (lines.length < 2) {
    return { sizes: {}, errors: ['Need at least a header row and one data row.'] };
  }

  // Repair rows split by unquoted multiline cells, e.g. a cell containing "110cm\n43.3inch"
  // produces: "FREE SIZE(03)\t110cm" then "43.3inch\t55cm" then "21.7inch\t51cm" etc.
  // A continuation line is detected when its first cell looks like a measurement value.
  const MEASUREMENT_LEAD_RE = /^\d+\.?\d*\s*(cm|inch|mm|in)\b/i;
  if (lines.slice(1).some(l => MEASUREMENT_LEAD_RE.test(l.split('\t')[0] ?? ''))) {
    const repaired = [];
    let pending = null;
    for (const rawLine of lines) {
      const cols = rawLine.split('\t').map(c => c.trim());
      if (pending !== null && MEASUREMENT_LEAD_RE.test(cols[0] ?? '')) {
        pending.push(...cols.slice(1)); // discard inch alt, append remaining values
      } else {
        if (pending !== null) repaired.push(pending.join('\t'));
        pending = [...cols];
      }
    }
    if (pending !== null) repaired.push(pending.join('\t'));
    lines = repaired;
  }

  const specResult = tryParseSpecSheet(lines, type, takeHalf);
  if (specResult) return specResult;

  const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());

  const colMap = TOPS_TYPES.has(type)  ? TOPS_COLUMN_MAP
               : PANTS_TYPES.has(type) ? PANTS_COLUMN_MAP
               : BAG_COLUMN_MAP;

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
  // Last fallback: if first header isn't a known measurement field, treat it as the size column.
  // Covers labels like "Main unit", "Item", "No.", etc.
  if (sizeIdx === -1 && !colMap[headers[0]]) sizeIdx = 0;
  if (sizeIdx === -1) {
    return { sizes: {}, errors: ['No "size" column found in header row.'] };
  }

  // Map each column index to its output field name.
  // Strip a leading "(Garment) " or "[Variant] " prefix so "(Blouse) Bust" / "[IND] Bust" → "bust" etc.
  const indexToField = {};
  headers.forEach((h, i) => {
    if (i === sizeIdx) return;
    const stripped = h.replace(/^(?:[(（][^)）]+[)）]|\[[^\]]+\])\s*/, '')  // strip leading qualifier
                      .replace(/\s*[(（][^)）]+[)）]$/, '').trim();            // strip trailing qualifier (inc. full-width （）)
    const field = colMap[h] ?? colMap[stripped];
    if (field && !(i in indexToField)) indexToField[i] = field;
  });

  // Paired-column format: sizes encoded as suffixes in column headers,
  // e.g. "Length S | M | Bust size S | M | Sleeve length S | M"
  // A standalone size-code column (like "M") inherits the field from the previous
  // "{field} S" column. Only triggered when normal column mapping found nothing.
  const SIZE_CODE_RE = /^(xs|s|m|l|xl|2xl|xxl|3xl|\d+)$/i;
  const FIELD_SIZE_RE = /^(.+?)\s+(xs|s|m|l|xl|2xl|xxl|3xl|\d+)$/i;
  const indexToFieldSize = {};
  if (Object.keys(indexToField).length === 0) {
    let lastField = null;
    headers.forEach((h, i) => {
      if (i === sizeIdx) return;
      const fsm = h.match(FIELD_SIZE_RE);
      if (fsm) {
        const fp = fsm[1].trim();
        const sz = fsm[2].toUpperCase();
        const field = colMap[fp] ?? colMap[fp.replace(/^(?:\([^)]+\)|\[[^\]]+\])\s*/, '')];
        if (field) { indexToFieldSize[i] = { field, size: sz }; lastField = field; }
      } else if (SIZE_CODE_RE.test(h) && lastField) {
        indexToFieldSize[i] = { field: lastField, size: h.toUpperCase() };
      }
    });
  }

  const sizes = {};
  const errors = [];
  const multiRow = lines.length > 2;

  if (Object.keys(indexToFieldSize).length > 0) {
    // Paired-column: each size suffix gets its own output entry
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t').map(c => c.trim());
      const rowLabel = normalizeLabel(cols[sizeIdx] ?? '');
      if (!rowLabel) continue;
      for (const [idxStr, { field, size }] of Object.entries(indexToFieldSize)) {
        const sizeLabel = multiRow ? `${rowLabel}/${size}` : size;
        if (!sizes[sizeLabel]) sizes[sizeLabel] = {};
        const nums = extractNumbers(cols[Number(idxStr)] ?? '');
        if (nums.length > 0 && !(field in sizes[sizeLabel])) sizes[sizeLabel][field] = nums[0];
      }
    }
    for (const [sizeLabel, measurements] of Object.entries(sizes)) {
      normalizeMeasurements(measurements, takeHalf);
      computeSleeve(measurements);
      const missing = TYPE_CONFIG[type].required.filter(k => !(k in measurements));
      if (missing.length) errors.push(`"${sizeLabel}" is missing required fields: ${missing.join(', ')}`);
    }
    return { sizes, errors };
  }

  // Transposed table: field names in col 0, size labels in header row cols 1..n.
  // Detected when indexToField and indexToFieldSize are both empty (the header's non-size
  // columns are numeric size codes, not field names) but data rows' col 0 values are known fields.
  if (Object.keys(indexToField).length === 0 && Object.keys(indexToFieldSize).length === 0) {
    // Preamble format: header row is just "size" alone (no field columns), the next
    // single-column line(s) are the size label, and the actual field table follows.
    // e.g. "size\nFREE\nheight\tWidth (bottom)\ttown\n15.5\ttwenty four\t8"
    if (headers.length === 1 && sizeIdx === 0) {
      const innerHeaderIdx = lines.findIndex((l, i) => i > 0 && l.includes('\t'));
      if (innerHeaderIdx > 0 && innerHeaderIdx + 1 < lines.length) {
        const preambleLabel = normalizeLabel(lines.slice(1, innerHeaderIdx).join(' ').trim());
        const innerHeaders = lines[innerHeaderIdx].split('\t').map(h => h.trim().toLowerCase());
        const innerIndexToField = {};
        innerHeaders.forEach((h, i) => {
          const stripped = h.replace(/\s*\([^)]+\)$/, '').trim();
          const f = colMap[h] ?? colMap[stripped];
          if (f) innerIndexToField[i] = f;
        });
        if (Object.keys(innerIndexToField).length > 0) {
          for (let i = innerHeaderIdx + 1; i < lines.length; i++) {
            const cols = lines[i].split('\t').map(c => c.trim());
            const measurements = {};
            for (const [idxStr, field] of Object.entries(innerIndexToField)) {
              const nums = extractNumbers(cols[Number(idxStr)] ?? '');
              if (nums.length > 0 && !(field in measurements)) measurements[field] = nums[0];
            }
            normalizeMeasurements(measurements, takeHalf);
            computeSleeve(measurements);
            const missing = TYPE_CONFIG[type].required.filter(k => !(k in measurements));
            if (missing.length) errors.push(`"${preambleLabel}" is missing required fields: ${missing.join(', ')}`);
            if (Object.keys(measurements).length > 0) sizes[preambleLabel] = measurements;
          }
          return { sizes, errors };
        }
      }
    }

    const transposedFields = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t').map(c => c.trim());
      const raw = (cols[0] ?? '').toLowerCase();
      const field = colMap[raw] ?? colMap[raw.replace(/\s*\([^)]+\)$/, '').trim()];
      const hasNumericValue = cols.slice(1).some(c => extractNumbers(c).length > 0);
      if (field && hasNumericValue) transposedFields.push({ field, values: cols.slice(1) });
    }
    if (transposedFields.length > 0) {
      const sizeLabels = headers.slice(1).map(h => normalizeLabel(h));
      for (const label of sizeLabels) if (label) sizes[label] = {};
      for (const { field, values } of transposedFields) {
        sizeLabels.forEach((label, si) => {
          if (!label) return;
          const val = parseFloat((values[si] ?? '').replace(',', '.'));
          if (!isNaN(val) && !(field in sizes[label])) sizes[label][field] = val;
        });
      }
      for (const [sizeLabel, measurements] of Object.entries(sizes)) {
        normalizeMeasurements(measurements, takeHalf);
        computeSleeve(measurements);
        const missing = TYPE_CONFIG[type].required.filter(k => !(k in measurements));
        if (missing.length) errors.push(`"${sizeLabel}" is missing required fields: ${missing.join(', ')}`);
      }
      return { sizes, errors };
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t').map(c => c.trim());
    const sizeLabel = normalizeLabel(cols[sizeIdx] ?? '');
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

const QUALIFIER_LABEL = /^(?:approx\.?|size)$/i;

function normalizeLabel(raw) {
  // Strip "Size " / "size " prefix — e.g. "Size S" → "S", "Size M" → "M"
  const label = raw.trim().replace(/^size\s+/i, '') || raw.trim();
  return QUALIFIER_LABEL.test(label) ? 'ONE SIZE' : label;
}

function splitLine(line) {
  // "[label] measurement" — e.g. "[Size] H13cm x W15cm x D2cm"
  const bracketM = line.match(/^\[([^\]]+)\]\s+(.+)$/);
  if (bracketM) return [normalizeLabel(bracketM[1]), bracketM[2].trim()];
  // Match label then optional-whitespace : whitespace then rest
  // Handles ASCII ":" and fullwidth "："; space after colon is optional for Japanese text
  const m = line.match(/^(.+?)\s*[:：]\s*(.+)$/);
  if (!m) return null;
  // If the potential label contains a middle dot it's a field separator string, not a size label
  if (m[1].includes('・')) return null;
  // Qualifiers like "Approx." are prefixes, not real size labels
  return [normalizeLabel(m[1]), m[2].trim()];
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

  // Named bag dimensions — handles optional qualifier in parens:
  // "Width (bottom): 29cm", "depth 8.0cm x width 35.0cm x height 14.5cm"
  if (type === 'bag') {
    const NAMED_BAG_RE = /(depth|width|height|length)\s*(?:\([^)]*\))?\s*:?\s*([\d.]+)/gi;
    const namedBagMatches = [...segment.matchAll(NAMED_BAG_RE)];
    if (namedBagMatches.length >= 1) {
      const NAME_MAP = { depth: 'depth', width: 'width', height: 'height', length: 'height' };
      for (const [, name, num] of namedBagMatches) {
        const field = NAME_MAP[name.toLowerCase()];
        if (field && !(field in result)) result[field] = parseFloat(num);
      }
      return result;
    }
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
    // Normalize "cmxH" / "cm×H" → "cm H" so \b works across the separator
    const normSeg = segment.replace(/cm\s*[xX×]\s*(?=[WHDLwhdl])/gi, 'cm ');
    const letterPrefixDims = [...normSeg.matchAll(/\b([WHDLwhdl])(\d+\.?\d*)\s*cm\b/g)];
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
    // Strip a known garment-type word prefix (e.g. "Dress", "Petticoat") but NOT
    // directional words like "front"/"back" — those need explicit map entries.
    const GARMENT_PREFIX = /^(?:dress|petticoat|blouse|shirt|jacket|coat|cape|sweater)\s+/i;
    const sNoGarment = s.replace(GARMENT_PREFIX, '');
    const candidates = [{ sl, s }];
    if (sNoGarment !== s) candidates.push({ sl: sNoGarment.toLowerCase(), s: sNoGarment });
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

  // Named pants measurements — e.g. "Suitable waist 58-64cm", "inseam 68cm", "hem width 16.5cm"
  if (PANTS_TYPES.has(type)) {
    const s = segment.replace(/^[(（][^)）]*[)）]\s*/, '').trim();
    const sl = s.toLowerCase();
    const sortedKeys = Object.keys(PANTS_COLUMN_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (sl.startsWith(key)) {
        const numMatch = s.slice(key.length).match(/\d+\.?\d*/);
        if (numMatch) {
          result[PANTS_COLUMN_MAP[key]] = parseFloat(numMatch[0]);
          return result;
        }
      }
    }
  }

  // Named bag measurements via BAG_COLUMN_MAP startsWith — handles Japanese field names
  // like "高さ40", "幅42", "まち2" (strips leading bullet/decoration chars like ■●◆).
  if (type === 'bag') {
    const s = segment.replace(/^[■●▪□◆◇・\s]+/, '').trim();
    const sl = s.toLowerCase();
    const sortedBagKeys = Object.keys(BAG_COLUMN_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedBagKeys) {
      if (sl.startsWith(key)) {
        const numMatch = s.slice(key.length).match(/\d+\.?\d*/);
        if (numMatch) {
          if (!(BAG_COLUMN_MAP[key] in result)) result[BAG_COLUMN_MAP[key]] = parseFloat(numMatch[0]);
          return result;
        }
      }
    }
  }

  return result;
}

function parseSingleLine(rawText, type, takeHalf) {
  const lines = joinContinuationLines(rawText).filter(l => l.trim());
  const sizes = {};
  const errors = [];

  // Column map used to detect when a line's label is itself a field name
  // (e.g. "F\nHeight: 30cm, Width: 42.5cm" — "Height" is a bag field, "F" is the size label).
  const colMap = type === 'bag' ? BAG_COLUMN_MAP
               : TOPS_TYPES.has(type) ? TOPS_COLUMN_MAP
               : PANTS_TYPES.has(type) ? PANTS_COLUMN_MAP
               : null;

  let pendingLabel = null;
  let lastSizeLabel = null;

  const storeMeasurements = (sizeLabel, measurements) => {
    normalizeMeasurements(measurements, takeHalf);
    computeSleeve(measurements);
    if (Object.keys(measurements).length === 0) return;
    const missing = TYPE_CONFIG[type].required.filter(k => !(k in measurements));
    if (missing.length) errors.push(`"${sizeLabel}" is missing required fields: ${missing.join(', ')}`);
    sizes[sizeLabel] = measurements;
    lastSizeLabel = sizeLabel;
  };

  for (const line of lines) {
    let split = splitLine(line);
    if (!split) {
      // No colon — try parsing as bare measurements (e.g. a dimension string)
      const segments = line.split(/[/・]/).map(s => s.replace(/^[■●▪□◆◇]+/, '').trim()).filter(Boolean);
      const bare = {};
      let potentialLabel = null;
      for (let si = 0; si < segments.length; si++) {
        const seg = segments[si];
        const res = parseSegment(seg, type);
        if (Object.keys(res).length > 0) {
          Object.assign(bare, res);
        } else if (si === 0 && !extractNumbers(seg).length) {
          potentialLabel = seg;
        }
      }
      if (Object.keys(bare).length > 0) {
        const sizeLabel = pendingLabel ?? potentialLabel ?? 'ONE SIZE';
        pendingLabel = null;
        storeMeasurements(sizeLabel, bare);
      } else {
        // No measurements — treat as a size label for the next line
        pendingLabel = potentialLabel ?? line;
      }
      continue;
    }

    const [label, measurementStr] = split;

    // If a pending size label exists and this line's own label is a known field
    // name, the whole line is "Field: val, Field: val, ..." and pendingLabel is the size.
    if (pendingLabel && colMap && label.toLowerCase() in colMap) {
      const sizeLabel = pendingLabel;
      pendingLabel = null;
      const segments = line.split(/[,、/]/).map(s => s.trim()).filter(Boolean);
      const measurements = {};
      for (const seg of segments) {
        for (const [k, v] of Object.entries(parseSegment(seg, type))) {
          if (!(k in measurements)) measurements[k] = v;
        }
      }
      storeMeasurements(sizeLabel, measurements);
      continue;
    }

    // If the label is a known field name with no pending label, this is a stray
    // continuation line (e.g. "Waist: 63cm" after a line that ended with a comma).
    // Merge it into the last size rather than creating a bogus "Waist" size entry.
    if (!pendingLabel && colMap && label.toLowerCase() in colMap && lastSizeLabel) {
      const segments = line.split(/[,、]/).map(s => s.trim()).filter(Boolean);
      for (const seg of segments) {
        for (const [k, v] of Object.entries(parseSegment(seg, type))) {
          if (!(k in sizes[lastSizeLabel])) sizes[lastSizeLabel][k] = v;
        }
      }
      continue;
    }

    pendingLabel = null;
    const segments = measurementStr.split(/[/,、・]/).map(s => s.replace(/^[■●▪□◆◇]+/, '').trim()).filter(Boolean);
    const measurements = {};
    for (const seg of segments) {
      for (const [k, v] of Object.entries(parseSegment(seg, type))) {
        if (!(k in measurements)) measurements[k] = v;
      }
    }
    storeMeasurements(label, measurements);
  }

  return { sizes, errors };
}

// ─── Graded measurement parser (Excel spec sheet: sizes as columns) ──────────

// Height priority tags — resolved after all rows are processed
// Priority: HPS+CB > HPS > CB > CF > other
const HEIGHT_PRIORITY = ['height$hps_cb', 'height$cf', 'height$cb', 'height$hps', 'height$full', 'height$other'];

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
  if (/sleeve.*from.*\bshoulder\b/.test(d)) return 'sleeve_length';
  if (/sleeve length from (cb|centre back|center back)/.test(d)) return 'sleeve';
  // Plain "sleeve length" with no from-qualifier — respect the Sleeve=arm toggle
  if (/\bsleeve\b.*\blength\b/.test(d) && !/from/.test(d)) return TOPS_COLUMN_MAP['sleeve length'] ?? 'sleeve_length';
  if (/(across shoulder|shoulder across|shoulder width|shoulder to shoulder)/.test(d)) return 'shoulder';
  if (/(chest|bust)/.test(d) && !/pocket/.test(d)) return 'bust';
  if (/(bicep|upper sleeve width)/.test(d)) return 'bicep';
  if (/(arm\s*(hole|opening)|armhole)/.test(d)) return 'armOpening';
  if ((/\bhem\b/.test(d) || (/\bbottom\b/.test(d) && !/width/.test(d))) && !/finished|position|length/.test(d)) return 'hem';

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
  if (/\bthigh\b/.test(d) && !/length|position/.test(d)) return 'thigh';
  if (/\bknee\b/.test(d) && !/length|position/.test(d)) return 'knee';
  if (/(leg\s*(bottom|opening))/.test(d)) return 'legOpening';

  // Bottom width — leg opening for pants, hem for tops
  if (/bottom width/.test(d) && !/sleeve/.test(d)) {
    return PANTS_TYPES.has(type) ? 'legOpening' : 'hem';
  }

  // Pants lengths
  if (/\boutseam\b/.test(d)) return null;
  if (/\b(inseam|inleg|inside\s+leg)\b/.test(d)) {
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

  // Height — tag by reference for priority resolution (not used for pants)
  if (!PANTS_TYPES.has(type) && /\bcbl\b/.test(d)) return 'height$cb'; // Center Back Length abbreviation
  if (!PANTS_TYPES.has(type) && /length/.test(d)) {
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
    const lines = inner.replace(/""/g, '"').split('\n').map(s => s.trim()).filter(Boolean);
    // Use the last non-empty line — for multi-row size-label cells like "XL/L\nXL"
    // the last line is the specific size code; for single-line cells this is unchanged.
    return prefix + (lines.at(-1) ?? '');
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

  // Skip title rows — find the first line that looks like a spec header.
  // Keyword matches (code, dim, pom, etc.) take priority over bare-numeric matches
  // so a product-info line like "Brand\tStyle\t115169" doesn't win over "Code\tPoint of measure\tW24".
  let headerLineIdx = 0;
  let numericFallbackIdx = -1;
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const cols = lines[i].split('\t').map(h => h.trim());
    if (cols.some(h => /^(description|pom|measuring|point\s*of\s*measure|code|dim|ref)/i.test(h))) {
      headerLineIdx = i;
      numericFallbackIdx = -1; // keyword wins, discard any numeric candidate
      break;
    }
    if (numericFallbackIdx === -1 && cols.some(h => /^[Ww]?\d+$/.test(h))) {
      numericFallbackIdx = i;
    }
  }
  if (numericFallbackIdx !== -1 && headerLineIdx === 0 &&
      !lines[0].split('\t').some(h => /^(description|pom|measuring|point\s*of\s*measure|code|dim|ref)/i.test(h.trim()))) {
    headerLineIdx = numericFallbackIdx;
  }
  const headers = lines[headerLineIdx].split('\t').map(h => h.trim());
  const dataStartIdx = headerLineIdx + 1;

  // Find description column, fallback to index 1
  const descIdx = (() => {
    const i = headers.findIndex(h =>
      /^description$/i.test(h) || /^pom\s*name$/i.test(h) ||
      /^measuring\s*point$/i.test(h) || /^point\s*of\s*measure$/i.test(h)
    );
    if (i !== -1) return i;
    // If col 1 is a translation column, col 0 contains the English descriptions
    if (headers.length > 1 && /^translation$/i.test(headers[1])) return 0;
    // If col 0 is "POM" and col 1 is a size code (simple or compound like XXS/XXXS),
    // col 0 is the description column
    const SIZE_UNIT = '(?:xxxs|xxs|xs|s|m|l|xl|2xl|xxl|3xl|xxxl|\\d+)';
    const SIZE_COL_RE = new RegExp(`^${SIZE_UNIT}(?:/${SIZE_UNIT})*$`, 'i');
    if (/^pom$/i.test(headers[0]) && headers.length > 1 && SIZE_COL_RE.test(headers[1])) return 0;
    return 1;
  })();

  // Find alt-description column for incl./excl. WB annotations
  const descAltIdx = headers.findIndex(h => /description.*(alt|\(alt\))/i.test(h));

  // Detect POM-format where data rows have one extra column (code + description + values)
  // but the header only has code + size names (no description column header).
  // In this case every size column index i maps to data column i+1.
  let sizeDataOffset = 0;
  for (let r = dataStartIdx; r < lines.length; r++) {
    const testCols = lines[r].split('\t').map(c => c.trim());
    if (testCols.filter(c => c).length <= 1) continue; // skip blank/section-title rows
    if (testCols.length === headers.length + 1 &&
        isNaN(parseFloat((testCols[1] ?? '').replace(',', '.')))) {
      sizeDataOffset = 1;
    }
    break;
  }

  // Size columns: any non-empty header that isn't the POM/code, description,
  // alt-description, or tolerance column. Handles numeric (32, W24) and text (XS, S/XS) sizes.
  const sizeCols = headers.reduce((acc, h, i) => {
    if (i === 0) return acc;                              // skip POM/code column
    if (sizeDataOffset === 0 && i === descIdx) return acc; // skip description column (normal format)
    if (descAltIdx >= 0 && i === descAltIdx) return acc; // skip alt description
    if (!h || /^tol/i.test(h) || !/[A-Za-z0-9]/.test(h)) return acc; // skip empty/tol/symbols
    // Skip columns whose header looks like a metadata label, not a size
    if (/^(pom|code|ref|dim|desc|meas|point|translat|hide|note|comment|colour|color|gender|season|fabric)/i.test(h)) return acc;
    const num = h.match(/^[Ww]?(\d+)$/);
    acc.push({ i, size: num ? num[1] : h });
    return acc;
  }, []);

  if (sizeCols.length === 0) return { sizes: {}, errors: ['No size columns found.'] };

  const sizes = {};
  for (const { size } of sizeCols) sizes[size] = {};

  for (let r = dataStartIdx; r < lines.length; r++) {
    const cols = lines[r].split('\t').map(c => c.trim());
    const desc    = sizeDataOffset > 0 ? (cols[1] ?? '') : (cols[descIdx] ?? '');
    const altDesc = descAltIdx >= 0 ? (cols[descAltIdx + sizeDataOffset] ?? '') : '';
    const field = matchGradedField(desc, altDesc, type);
    if (!field) continue;

    for (const { i, size } of sizeCols) {
      const val = parseFloat((cols[i + sizeDataOffset] ?? '').replace(',', '.'));
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

// ─── Space-separated graded parser (web-UI copy with no tab separators) ─────────
// Format: "Dim Description Description (Alt) Hide Tol (-) Tol" header (no tabs),
// then a line of space-separated size labels, then POM description line(s), then
// one data line per measurement with alt-desc + tolerances + values (European decimals).

function isSpaceSeparatedGradedFormat(rawText) {
  const first3 = rawText.trim().split('\n').slice(0, 3);
  return first3.some(l => !l.includes('\t') && /\bdim\b/i.test(l) && /\bdescription\b/i.test(l));
}

function parseSpaceSeparatedGraded(rawText, type, takeHalf) {
  const lines = rawText.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const sizes = {};
  const errors = [];

  // Find the size-label line: all space-separated tokens are recognized size codes
  const SIZE_TOKEN_RE = /^(xxs|xs|s|m|l|xl|2xl|3xl|xxl|\d+)$/i;
  let sizeLabels = [];
  for (const line of lines) {
    const tokens = line.split(/\s+/);
    if (tokens.length >= 2 && tokens.every(t => SIZE_TOKEN_RE.test(t))) {
      sizeLabels = tokens.map(t => t.toUpperCase());
      break;
    }
  }
  if (sizeLabels.length === 0) return { sizes: {}, errors: ['Could not find size labels.'] };
  const nSizes = sizeLabels.length;
  for (const s of sizeLabels) sizes[s] = {};

  // Parse POM description lines: lines that have POM codes (e.g. BW005) but no
  // comma-decimal numbers. Extract descriptions in encounter order.
  const POM_CODE_TEST = /[A-Z]{1,3}\d{3,}/;
  const POM_EXTRACT = /([A-Z]{1,3}\d{3,})\s+(.+?)(?=\s+[A-Z]{1,3}\d{3,}|\s+(?:CORE|OTHER)\s+MEASUREMENTS|$)/g;
  const orderedDescriptions = [];
  for (let line of lines) {
    if (!POM_CODE_TEST.test(line) || /\d,\d/.test(line)) continue;
    line = line.split(/\s+Displaying\s+\d/)[0]; // strip pagination text
    POM_EXTRACT.lastIndex = 0;
    let m;
    while ((m = POM_EXTRACT.exec(line)) !== null) {
      const desc = m[2].trim();
      if (desc) orderedDescriptions.push(desc);
    }
  }

  // Find data lines: lines with ≥ nSizes comma-decimal numbers (European format)
  const COMMA_NUM = /[-]?\d+,\d+/g;
  const dataLines = [];
  for (const line of lines) {
    const nums = [...line.matchAll(COMMA_NUM)].map(m => parseFloat(m[0].replace(',', '.')));
    if (nums.length >= nSizes) dataLines.push(nums);
  }

  // Match data lines to descriptions by index; take last nSizes values per row
  for (let i = 0; i < Math.min(dataLines.length, orderedDescriptions.length); i++) {
    const field = matchGradedField(orderedDescriptions[i], '', type);
    if (!field) continue;
    const values = dataLines[i].slice(-nSizes);
    values.forEach((val, si) => {
      const label = sizeLabels[si];
      if (!isNaN(val) && !(field in sizes[label])) sizes[label][field] = val;
    });
  }

  // Same normalization as parseGraded
  for (const m of Object.values(sizes)) {
    for (const key of WAIST_PRIORITY) { if (key in m) { m.waist = m[key]; break; } }
    for (const key of WAIST_PRIORITY) delete m[key];
    for (const key of HIP_PRIORITY) { if (key in m) { m.hip = m[key]; break; } }
    for (const key of HIP_PRIORITY) delete m[key];
    normalizeMeasurements(m, takeHalf);
    const wb = m._waistband ?? 0;
    delete m._waistband;
    if ('frontRise$incl' in m) m.frontRise = m['frontRise$incl'];
    else if ('frontRise$excl' in m) m.frontRise = m['frontRise$excl'] + wb;
    if ('backRise$incl' in m)  m.backRise  = m['backRise$incl'];
    else if ('backRise$excl' in m)  m.backRise  = m['backRise$excl'] + wb;
    for (const key of RISE_TAGS) delete m[key];
    for (const key of HEIGHT_PRIORITY) { if (key in m) { m.height = m[key]; break; } }
    for (const key of HEIGHT_PRIORITY) delete m[key];
    computeSleeve(m);
  }

  return { sizes: expandInseamCombinations(sizes), errors };
}

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
  // Apply continuation-line joining first so "Size F\n: Length: ..." is seen as one line.
  const firstLine = (joinContinuationLines(rawText).find(l => l.trim()) ?? '');
  return !firstLine.includes('\t') && splitLine(firstLine) !== null;
}

// Field-per-line format: each line is "FieldName: value1/value2/..."
// Detected when the first line's label is a known output field for the current type.
function isFieldValueFormat(rawText, type) {
  const firstLine = rawText.trim().split('\n')[0];
  const split = splitLine(firstLine);
  if (!split) return false;
  const [label] = split;
  const colMap = type === 'bag' ? BAG_COLUMN_MAP
               : TOPS_TYPES.has(type) ? TOPS_COLUMN_MAP
               : PANTS_TYPES.has(type) ? PANTS_COLUMN_MAP
               : null;
  return colMap ? label.toLowerCase() in colMap : false;
}

function parseFieldValueLines(rawText, type, takeHalf) {
  const colMap = type === 'bag' ? BAG_COLUMN_MAP
               : TOPS_TYPES.has(type) ? TOPS_COLUMN_MAP
               : PANTS_TYPES.has(type) ? PANTS_COLUMN_MAP
               : null;
  if (!colMap) return { sizes: {}, errors: [] };

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const fieldRows = [];
  const errors = [];

  for (const line of lines) {
    const split = splitLine(line);
    if (!split) continue;
    const [label, valueStr] = split;
    const field = colMap[label.toLowerCase()];
    if (!field) continue;
    const values = valueStr.split('/').map(s => {
      const m = s.match(/\d+\.?\d*/);
      return m ? parseFloat(m[0]) : null;
    }).filter(v => v !== null);
    if (values.length > 0) fieldRows.push({ field, values });
  }

  const maxLen = Math.max(...fieldRows.map(r => r.values.length), 1);
  const sizes = {};

  for (let i = 0; i < maxLen; i++) {
    const sizeLabel = maxLen === 1 ? 'ONE SIZE' : String(i + 1);
    const measurements = {};
    for (const { field, values } of fieldRows) {
      measurements[field] = values[Math.min(i, values.length - 1)];
    }
    normalizeMeasurements(measurements, takeHalf);
    if (Object.keys(measurements).length > 0) {
      const missing = TYPE_CONFIG[type].required.filter(k => !(k in measurements));
      if (missing.length) errors.push(`"${sizeLabel}" is missing required fields: ${missing.join(', ')}`);
      sizes[sizeLabel] = measurements;
    }
  }

  return { sizes, errors };
}

function isBlockFormat(rawText) {
  // Only treat as block if [label] appears on a line by itself (no measurement content after it)
  return /^\[.+\]\s*$/m.test(rawText);
}

// Join lines starting with ':' or ',' onto the previous line (handles mid-field line breaks).
function joinContinuationLines(rawText) {
  const lines = rawText.split('\n');
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) { out.push(''); continue; }
    if ((t[0] === ':' || t[0] === ',') && out.length > 0) {
      out[out.length - 1] = out[out.length - 1].trimEnd() + t;
    } else {
      out.push(t);
    }
  }
  return out;
}

function parseBlockFormat(rawText, type, takeHalf) {
  const colMap = TOPS_TYPES.has(type) ? TOPS_COLUMN_MAP
               : PANTS_TYPES.has(type) ? PANTS_COLUMN_MAP
               : null;
  if (!colMap) return { sizes: {}, errors: ['Block format not supported for this type.'] };

  const lines = joinContinuationLines(rawText);
  const sizes = {};
  const errors = [];
  let currentSize = null;
  let allSections = {};   // section name (lowercase) → { field: value }
  let currentSection = '_default';
  const typeSection = type.toLowerCase();

  const parseFieldStr = (str) => {
    const m = str.match(/^(.+?)\s*[:：]\s*(.+)$/);
    if (!m) return null;
    const keyStr = m[1].trim().toLowerCase();
    const valStr = m[2].trim();
    const field = colMap[keyStr];
    if (!field) return null;
    const numMatch = valStr.match(/\d+\.?\d*/);
    return numMatch ? [field, parseFloat(numMatch[0])] : null;
  };

  const flushSize = () => {
    if (!currentSize) return;
    const preferred = allSections[typeSection];
    const sourceSections = preferred ? [preferred] : Object.values(allSections);
    const measurements = {};
    for (const sec of sourceSections) {
      for (const [k, v] of Object.entries(sec)) {
        if (!(k in measurements)) measurements[k] = v;
      }
    }
    normalizeMeasurements(measurements, takeHalf);
    computeSleeve(measurements);
    if (Object.keys(measurements).length > 0) {
      const config = TYPE_CONFIG[type];
      const missing = config.required.filter(k => !(k in measurements));
      if (missing.length) errors.push(`"${currentSize}" is missing required fields: ${missing.join(', ')}`);
      sizes[currentSize] = measurements;
    }
    allSections = {};
    currentSection = '_default';
  };

  for (const line of lines) {
    if (!line) continue;

    const sizeMatch = line.match(/^\[(.+)\]$/);
    if (sizeMatch) {
      flushSize();
      currentSize = sizeMatch[1].replace(/^size\s+/i, '').trim();
      continue;
    }

    const sectionMatch = line.match(/^\(([^)]+)\)$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase();
      if (!allSections[currentSection]) allSections[currentSection] = {};
      continue;
    }

    if (!currentSize) continue;
    if (!allSections[currentSection]) allSections[currentSection] = {};

    for (const part of line.split(',').map(s => s.trim()).filter(Boolean)) {
      const parsed = parseFieldStr(part);
      if (parsed) {
        const [k, v] = parsed;
        if (!(k in allSections[currentSection])) allSections[currentSection][k] = v;
      }
    }
  }

  flushSize();
  return { sizes, errors };
}

// Detect web-table copy where every cell lands on its own line.
// Supports both blank-line-separated (double \n) and single-newline variants.
// e.g. "Size / Cm\n\nTotal\n\nChest\n\nS\n\n50\n\n74\n\n..."
// e.g. "size\nLength\nshoulder width\nF (One Size Fits All)\n58\n75\n..."
function isLinearizedTableFormat(rawText) {
  if (rawText.includes('\t')) return false;
  const sep = rawText.includes('\n\n') ? /\n\n+/ : /\n/;
  const cells = rawText.split(sep).map(c => c.trim()).filter(Boolean);
  if (cells.length < 6) return false;
  if (!cells.slice(0, 2).every(c => !/^\d+\.?\d*$/.test(c))) return false;
  return _linearColCount(cells) > 0;
}

// A row-start cell is invalid as a size label if it is a dash, a measurement with a unit,
// or an all-CJK/Japanese/Korean string (those are field names, not size codes).
// Cells that are alphanumeric product codes like "W28L32ｲﾝﾁ" pass because they contain ASCII.
function _invalidSizeStart(c) {
  if (!c || /^[-–—]+$/.test(c)) return true;
  if (/^\d+\.?\d*\s*(cm|mm|in|inch|kg|g|lbs?)\b/i.test(c)) return true;
  // All-CJK/kana/hangul — field names in Japanese/Korean tables
  if (/^[　-鿿가-힯豈-﫿＀-￿\s（）「」！？、。・ー]+$/.test(c)) return true;
  return false;
}

function _linearColCount(cells) {
  const isDecimal = s => /^\d+\.?\d*$/.test(s);
  for (let colCount = 2; colCount <= 10 && colCount < cells.length; colCount++) {
    const rowStarts = [];
    let valid = true;
    for (let i = colCount; i < cells.length; i += colCount) {
      if (_invalidSizeStart(cells[i])) { valid = false; break; }
      rowStarts.push(cells[i]);
    }
    if (!valid) continue;
    // Consistency: row starts must be all-numeric OR all-non-numeric, never mixed.
    // Mixed means some are field values and some are size codes → wrong colCount.
    const numCount = rowStarts.filter(c => isDecimal(c)).length;
    if (numCount > 0 && numCount < rowStarts.length) continue;
    if (rowStarts.length > 0 && cells.slice(colCount, 2 * colCount).some(c => /\d/.test(c))) return colCount;
  }
  return -1;
}

// Reshape linearized cells into a TSV string using the detected column count.
function delinearizeTable(rawText) {
  const sep = rawText.includes('\n\n') ? /\n\n+/ : /\n/;
  const cells = rawText.split(sep).map(c => c.trim()).filter(Boolean);
  const colCount = _linearColCount(cells);
  if (colCount < 0) return rawText;
  const rows = [];
  for (let i = 0; i < cells.length; i += colCount) {
    rows.push(cells.slice(i, i + colCount).join('\t'));
  }
  return rows.join('\n');
}

function parse(rawText, type, takeHalf) {
  if (isLinearizedTableFormat(rawText)) rawText = delinearizeTable(rawText);
  if (isBlockFormat(rawText)) return parseBlockFormat(rawText, type, takeHalf);
  if (isSpaceSeparatedGradedFormat(rawText)) return parseSpaceSeparatedGraded(rawText, type, takeHalf);
  if (isGradedFormat(rawText)) return parseGraded(rawText, type, takeHalf);
  if (isFieldValueFormat(rawText, type)) return parseFieldValueLines(rawText, type, takeHalf);
  if (isSingleLineFormat(rawText)) return parseSingleLine(rawText, type, takeHalf);
  const firstLine = rawText.trim().split('\n')[0];
  const bagTabular = type === 'bag' && firstLine.includes('\t') && !firstLine.includes(':');
  const hasTabular = (TOPS_TYPES.has(type) || PANTS_TYPES.has(type)) && (rawText.includes('\t') || isTabularFormat(rawText));
  if (hasTabular || isTabularFormat(rawText) || bagTabular) return parseTabular(rawText, type, takeHalf);
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
const yukiBtn   = document.getElementById('yuki-btn');
const sleeveBtn = document.getElementById('sleeve-btn');
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

let yukiAsSleeve = false;
yukiBtn.addEventListener('click', () => {
  yukiAsSleeve = !yukiAsSleeve;
  yukiBtn.classList.toggle('active', yukiAsSleeve);
  TOPS_COLUMN_MAP['yuki']     = yukiAsSleeve ? 'sleeve' : 'sleeve_length';
  TOPS_COLUMN_MAP['yukitake'] = yukiAsSleeve ? 'sleeve' : 'sleeve_length';
  TOPS_COLUMN_MAP['ゆき']    = yukiAsSleeve ? 'sleeve' : 'sleeve_length';
  TOPS_COLUMN_MAP['ゆき丈']  = yukiAsSleeve ? 'sleeve' : 'sleeve_length';
});

let sleeveAsArm = false;
sleeveBtn.addEventListener('click', () => {
  sleeveAsArm = !sleeveAsArm;
  sleeveBtn.classList.toggle('active', sleeveAsArm);
  const sleeveTarget = sleeveAsArm ? 'sleeve' : 'sleeve_length';
  for (const key of ['sleeve length', '袖丈', '소매길이']) {
    TOPS_COLUMN_MAP[key] = sleeveTarget;
  }
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
