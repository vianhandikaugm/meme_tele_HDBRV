/** -------------------- BASIC FILTER (common skip) -------------------- **/
function shouldSkipCommon(raw) {
  if (!raw) return true;

  if (/VIP\s*access:\s*@axioinvite_bot/i.test(raw)) return true;

  if (
    /^info\s+bonk\s+here\s*:?\s*https?:\/\/t\.me\/axioscan\/\d+\s*$/i.test(raw)
  )
    return true;

  const communityPromo = [
    /t\.me\/familyaxio/i,
    /discord\.gg\//i,
    /t\.me\/boost\/axioscan/i,
    /referral\s+program/i,
    /vote\s+for\s+us/i,
    /support\s+the\s+project/i,
    /trade\s+together/i,
    /ask\s+questions/i,
  ];
  if (communityPromo.some((rx) => rx.test(raw))) return true;

  if (/\bGrowth:\s*x\d+(?:\.\d+)?\b/i.test(raw)) return true;

  return false;
}

/** -------------------- PARSERS -------------------- **/
function parseMoneyToNumber(input) {
  if (!input) return NaN;

  const cleaned = String(input).replace(/\$/g, '').replace(/,/g, '').trim();
  const m = cleaned.match(/(\d+(?:\.\d+)?)([KMB])?/i);
  if (!m) return NaN;

  const val = Number(m[1]);
  if (!Number.isFinite(val)) return NaN;

  const unit = (m[2] || '').toUpperCase();
  const mult =
    unit === 'K'
      ? 1_000
      : unit === 'M'
      ? 1_000_000
      : unit === 'B'
      ? 1_000_000_000
      : 1;

  return val * mult;
}

function parseAxi(raw) {
  const mcMatch = raw.match(/📊\s*MC:\s*\$?\s*([0-9.,]+\s*[KMB]?)/i);
  const mc = parseMoneyToNumber(mcMatch?.[1]);

  const holdersMatch = raw.match(/👥\s*Holders:\s*([\d,]+)/i);
  const holders = holdersMatch
    ? Number(String(holdersMatch[1]).replace(/,/g, ''))
    : NaN;

  return { mc, holders };
}

/** -------------------- CLEANER (strip footer only) -------------------- **/
function stripFooter(raw) {
  let s = String(raw)
    .replace(/\r\n/g, '\n')
    .replace(/\(\s*https?:\/\/[^)]+\)/gi, '')
    .replace(/https?:\/\/\S+/gi, '');

  const dropLine = (line) => {
    const t = line.trim();
    if (!t) return false;

    if (/^🔎\s*Search\b/i.test(t)) return true;
    if (/^🔗\s*(DEX|Bubble|RugCheck|TH)\b/i.test(t)) return true;
    if (/^💸\s*(GMGN|NEO|BullX|Fasol|Bonk)\b/i.test(t)) return true;
    if (/^Follow\s+@AXIOSCAN\b/i.test(t)) return true;

    return false;
  };

  return s
    .split('\n')
    .filter((ln) => !dropLine(ln))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** -------------------- CLASSIFIER (4 buckets) -------------------- **/
function classify({ mc, holders }) {
  if (!Number.isFinite(mc) || !Number.isFinite(holders)) return 'others';

  // 1 & 2: 0–30k
  if (mc >= 0 && mc <= 30_000) {
    // 1) LOW HOLDERS EARLY
    if (holders < 90) return 'low_holders';

    // 2) GOOD HOLDERS EARLY
    return 'good_holders';
  }

  // 3) MID CAP BUILDING: >30k–80k & holders >=120
  if (mc > 30_000 && mc <= 80_000) {
    if (holders >= 120) return 'mid_cap';
    return 'others';
  }

  return 'others';
}

/** -------------------- EXPORTS -------------------- **/
export function axioscanPremiumHandler({ sourceName, text }) {
  const raw = String(text ?? '').trim();
  if (!raw || shouldSkipCommon(raw)) return null;

  const d = parseAxi(raw);
  const target = classify(d);

  // premium handler hanya ambil bucket MID CAP BUILDING
  if (target !== 'mid_cap') return null;

  const cleaned = stripFooter(raw);
  if (!cleaned) return null;

  return { target: 'mid_cap', text: cleaned.trim() };
}

export function axioscanFreeHandler({ sourceName, text }) {
  const raw = String(text ?? '').trim();
  if (!raw || shouldSkipCommon(raw)) return null;

  const d = parseAxi(raw);
  const target = classify(d);

  // biar tidak double-send, mid_cap biar premiumHandler yang ambil
  if (target === 'mid_cap') return null;

  const cleaned = stripFooter(raw);
  if (!cleaned) return null;

  return { target, text: cleaned.trim() };
}
