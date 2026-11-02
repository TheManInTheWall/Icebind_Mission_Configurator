export interface WeightedOption {
  name: string;
  score: number;
  note?: string;
}

export interface SheetWeights {
  /** D1:E4 — Mission Types */
  missions: WeightedOption[];
  /** G1:H5 — Additional Setting 1 (Mission Binds) */
  setting1: WeightedOption[];
  /** J1:K14 — Additional Setting 2 (Tactical Binds) */
  setting2: WeightedOption[];
}

export const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1rrzniKaPt38JsWPeIIGPZ0avNQdol_1_v86V82t03cc/edit?gid=730193451#gid=730193451';

export const DEFAULT_SHEET_ID = '1rrzniKaPt38JsWPeIIGPZ0avNQdol_1_v86V82t03cc';
export const DEFAULT_SHEET_GID = '730193451';

export const BIND_NOTES: Record<string, string> = {
  // Mission Binds (G1:H5)
  'Stone Soldiers': 'Stony enemies with weak points + hostile Tomb Guardians.',
  Inferno: 'Heat status feeds the Inferno and draws Arson Eximus.',
  'Entropic Overload': 'Abilities spawn Entropic Crystals & self-reviving Leech Eximus.',
  'Thin Boundary': 'Void Tears grow near ability use, draining energy/HP/stats.',
  'Miasmic Militia': 'Immune to Toxin, Gas, Viral & Corrosive status; gas clouds on death.',
  // Tactical Binds (J1:K14)
  'Archaic Armor': 'Greatly increased armor; cannot strip normally (-1% max armor per hit).',
  'Clumsy Munitions': 'Taking damage may drop a delayed grenade at your feet.',
  'Antimatter Foes': 'Ability kills spawn a tracking hostile Antimatter Drop.',
  Entanglement: 'Slain enemies within 4m slow movement & parkour velocity.',
  "Kela's Revenge": 'Periodic missile strikes from above.',
  'Jade Spirits': 'Jade Wisps chase nearby players and become Jade Light beams.',
  'Postmortal Surges': 'Slain enemies explode with Void energy.',
  'Toasty Toes': 'Grounded movement deals Heat DoT; airborne movement reduces it.',
  'Bolstered Belligerents': 'All enemies gain Overguard equal to 50% max health.',
  Cumulonimbus: 'Airborne time builds electrical damage; dissipates on ground.',
  'Heavy Warfare': 'Non-heavy weapons deal -90% damage; heavy ammo drops.',
  'Bruised Shields': 'Shields only restore via melee attacks.',
  'Myopic Munitions': 'Enemies only take damage when a player is within 15m.',
  'Parasitic Light': 'Two energy-draining lanterns; massive DR outside lantern light.',
};

export const DEFAULT_WEIGHTS: SheetWeights = {
  // D1:E4
  missions: [
    { name: 'Disruption', score: 5 },
    { name: 'Survival', score: 3.666 },
    { name: 'Excavation', score: 3 },
    { name: 'Mobile Defence', score: 1.333 },
  ],
  // G1:H5
  setting1: [
    { name: 'Stone Soldiers', score: 4.333, note: BIND_NOTES['Stone Soldiers'] },
    { name: 'Inferno', score: 3, note: BIND_NOTES['Inferno'] },
    { name: 'Entropic Overload', score: 2.666, note: BIND_NOTES['Entropic Overload'] },
    { name: 'Thin Boundary', score: 2.333, note: BIND_NOTES['Thin Boundary'] },
    { name: 'Miasmic Militia', score: 1.666, note: BIND_NOTES['Miasmic Militia'] },
  ],
  // J1:K14
  setting2: [
    { name: 'Archaic Armor', score: 4.333, note: BIND_NOTES['Archaic Armor'] },
    { name: 'Clumsy Munitions', score: 4, note: BIND_NOTES['Clumsy Munitions'] },
    { name: 'Antimatter Foes', score: 3.666, note: BIND_NOTES['Antimatter Foes'] },
    { name: 'Entanglement', score: 3.666, note: BIND_NOTES['Entanglement'] },
    { name: "Kela's Revenge", score: 3.666, note: BIND_NOTES["Kela's Revenge"] },
    { name: 'Jade Spirits', score: 3.333, note: BIND_NOTES['Jade Spirits'] },
    { name: 'Postmortal Surges', score: 3.333, note: BIND_NOTES['Postmortal Surges'] },
    { name: 'Toasty Toes', score: 3.333, note: BIND_NOTES['Toasty Toes'] },
    { name: 'Bolstered Belligerents', score: 3, note: BIND_NOTES['Bolstered Belligerents'] },
    { name: 'Cumulonimbus', score: 2.666, note: BIND_NOTES['Cumulonimbus'] },
    { name: 'Heavy Warfare', score: 2.666, note: BIND_NOTES['Heavy Warfare'] },
    { name: 'Bruised Shields', score: 2.333, note: BIND_NOTES['Bruised Shields'] },
    { name: 'Myopic Munitions', score: 2.333, note: BIND_NOTES['Myopic Munitions'] },
    { name: 'Parasitic Light', score: 1.666, note: BIND_NOTES['Parasitic Light'] },
  ],
};

export function extractSheetParams(urlOrId: string): { sheetId: string; gid: string } {
  const trimmed = urlOrId.trim();
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = trimmed.match(/[?#&]gid=(\d+)/);
  return {
    sheetId: idMatch ? idMatch[1] : trimmed || DEFAULT_SHEET_ID,
    gid: gidMatch ? gidMatch[1] : DEFAULT_SHEET_GID,
  };
}

function parseLocaleNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).trim().replace(',', '.');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Standard RFC-4180 compatible CSV parser into 2D string array
 */
export function parseCsvToGrid(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      } else {
        current += ch;
      }
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function extractColumnPair(
  grid: unknown[][],
  nameCol: number,
  scoreCol: number,
  maxRowsHint: number
): WeightedOption[] {
  const items: WeightedOption[] = [];
  const limit = Math.max(grid.length, maxRowsHint);

  for (let r = 0; r < limit; r++) {
    const row = grid[r];
    if (!row) continue;
    const rawName = row[nameCol];
    const rawScore = row[scoreCol];
    const name = rawName !== undefined && rawName !== null ? String(rawName).trim() : '';
    const score = parseLocaleNumber(rawScore);

    if (name && score !== null) {
      items.push({
        name,
        score: Math.round(score * 1000) / 1000,
        note: BIND_NOTES[name],
      });
    } else if (items.length >= maxRowsHint) {
      break;
    }
  }

  return items;
}

export function extractWeightsFromGrid(grid: unknown[][]): SheetWeights | null {
  // D1:E4 => cols 3 & 4
  const missions = extractColumnPair(grid, 3, 4, 4);
  // G1:H5 => cols 6 & 7
  const setting1 = extractColumnPair(grid, 6, 7, 5);
  // J1:K14 => cols 9 & 10
  const setting2 = extractColumnPair(grid, 9, 10, 14);

  if (missions.length >= 2 && setting1.length >= 2 && setting2.length >= 2) {
    return { missions, setting1, setting2 };
  }

  // Fallback check if user pasted starting at D1 (shifted left by 3 columns: A:B, D:E, G:H)
  const shiftedMissions = extractColumnPair(grid, 0, 1, 4);
  const shiftedSetting1 = extractColumnPair(grid, 3, 4, 5);
  const shiftedSetting2 = extractColumnPair(grid, 6, 7, 14);

  if (
    shiftedMissions.length >= 2 &&
    shiftedSetting1.length >= 2 &&
    shiftedSetting2.length >= 2
  ) {
    return {
      missions: shiftedMissions,
      setting1: shiftedSetting1,
      setting2: shiftedSetting2,
    };
  }

  return null;
}

/**
 * Parse TSV (copied straight from Google Sheets) or CSV
 */
export function parsePastedSheetText(rawText: string): SheetWeights | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;
  if (trimmed.includes('\t')) {
    const tsvGrid = trimmed.split(/\r?\n/).map((line) => line.split('\t'));
    const parsed = extractWeightsFromGrid(tsvGrid);
    if (parsed) return parsed;
  }
  const csvGrid = parseCsvToGrid(trimmed);
  return extractWeightsFromGrid(csvGrid);
}

interface GvizCell {
  v?: string | number | null;
  f?: string | null;
}

interface GvizResponse {
  status?: string;
  table?: {
    cols?: { label?: string }[];
    rows?: { c?: (GvizCell | null)[] }[];
  };
}

/**
 * CORS-free JSONP reader using Google Visualization API responseHandler
 * Works directly from static GitHub Pages or local HTML files when the sheet is viewable by link.
 */
function fetchViaGvizJsonp(sheetId: string, gid: string, timeoutMs = 6500): Promise<SheetWeights> {
  return new Promise((resolve, reject) => {
    const cbName = `__icebindSheetCb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement('script');
    script.dataset.tempJsonp = 'true';

    const cleanup = () => {
      try {
        delete (window as unknown as Record<string, unknown>)[cbName];
      } catch {
        (window as unknown as Record<string, unknown>)[cbName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Google Sheet JSONP request timed out (sheet may require public link sharing).'));
    }, timeoutMs);

    (window as unknown as Record<string, unknown>)[cbName] = (resp: GvizResponse) => {
      window.clearTimeout(timer);
      cleanup();

      if (!resp || resp.status === 'error' || !resp.table) {
        reject(new Error('Google Sheet returned an error response.'));
        return;
      }

      const grid: unknown[][] = [];

      // Check if GViz placed Row 1 inside column labels despite headers=0
      const cols = resp.table.cols || [];
      const hasUsefulLabels = cols.some((c) => c && c.label && c.label.trim().length > 0);
      if (hasUsefulLabels) {
        grid.push(cols.map((c) => c?.label ?? ''));
      }

      for (const r of resp.table.rows || []) {
        const cells = r?.c || [];
        grid.push(cells.map((cell) => (cell ? cell.v ?? cell.f ?? '' : '')));
      }

      const weights = extractWeightsFromGrid(grid);
      if (!weights) {
        reject(new Error('Parsed sheet table, but D1:E4 / G1:H5 / J1:K14 ranges did not match expected format.'));
        return;
      }
      resolve(weights);
    };

    script.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('Could not load Google Sheet (check "Anyone with the link" viewer permission).'));
    };

    script.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
      sheetId
    )}/gviz/tq?gid=${encodeURIComponent(gid)}&headers=0&tqx=out:json;responseHandler=${cbName}`;
    document.head.appendChild(script);
  });
}

async function fetchViaCsvEndpoint(url: string, timeoutMs = 5000): Promise<SheetWeights> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, credentials: 'omit' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const text = await res.text();
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error('Sheet returned HTML sign-in page instead of CSV.');
    }
    const grid = parseCsvToGrid(text);
    const weights = extractWeightsFromGrid(grid);
    if (!weights) {
      throw new Error('CSV fetched, but D1:E4 / G1:H5 / J1:K14 values were not found.');
    }
    return weights;
  } finally {
    window.clearTimeout(timer);
  }
}

export interface SheetSyncResult {
  weights: SheetWeights;
  method: 'gviz-csv' | 'export-csv' | 'gviz-jsonp';
}

export async function fetchGoogleSheetWeights(urlOrId: string): Promise<SheetSyncResult> {
  const { sheetId, gid } = extractSheetParams(urlOrId);

  const gvizCsvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
    sheetId
  )}/gviz/tq?tqx=out:csv&headers=0&gid=${encodeURIComponent(gid)}`;

  try {
    const weights = await fetchViaCsvEndpoint(gvizCsvUrl);
    return { weights, method: 'gviz-csv' };
  } catch {
    // Try export CSV next
  }

  const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
    sheetId
  )}/export?format=csv&gid=${encodeURIComponent(gid)}`;

  try {
    const weights = await fetchViaCsvEndpoint(exportCsvUrl);
    return { weights, method: 'export-csv' };
  } catch {
    // Fallback to CORS-free JSONP script loader
  }

  const weights = await fetchViaGvizJsonp(sheetId, gid);
  return { weights, method: 'gviz-jsonp' };
}
