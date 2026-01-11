/** -------------------- HARDCODE FILTERS -------------------- **/
const PREMIUM_RULES = {
  maxMc: 20_000,
  minHolders: 80,
  devHoldExact: 0,
  minTop10Strict: 17,
};

const MOON_RULES = {
  minMc: 0,
  maxMc: 40_000,
  minHolders: 80,
  maxDevHold: 4,
  minTop10Strict: 17,
};

const STAR_RULES = {
  minMc: 0,
  maxMc: 80_000,
  minHolders: 150,
  devHoldExact: 0,
};

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
  const title = (String(raw).split('\n')[0] || '').trim();

  const caMatch = raw.match(/^\s*CA:\s*([A-Za-z0-9]+)\s*$/m);
  const ca = caMatch?.[1] ?? null;

  const mcMatch = raw.match(/📊\s*MC:\s*\$?\s*([0-9.,]+\s*[KMB]?)/i);
  const mc = parseMoneyToNumber(mcMatch?.[1]);

  const holdersMatch = raw.match(/👥\s*Holders:\s*([\d,]+)/i);
  const holders = holdersMatch
    ? Number(String(holdersMatch[1]).replace(/,/g, ''))
    : NaN;

  const devHoldMatch = raw.match(/Dev\s*hold:\s*([0-9.]+)\s*%/i);
  const devHold = devHoldMatch ? Number(devHoldMatch[1]) : NaN;

  const top10Match = raw.match(/Top\s*10\s*Holders:\s*(?:Σ\s*)?([0-9.]+)\s*%/i);
  const top10 = top10Match ? Number(top10Match[1]) : NaN;

  const socialsMatch = raw.match(/🌐\s*Socials:\s*([^\n]+)/i);
  const socialsRaw = socialsMatch?.[1] ?? '';
  const socials = socialsRaw
    .split(/[\|,]/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  return { title, ca, mc, holders, devHold, top10, socials };
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

  const lines = s.split('\n');
  const kept = lines.filter((ln) => !dropLine(ln));

  return kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** -------------------- RULE CHECKERS -------------------- **/
function hasAllSocials(list, required) {
  const set = new Set((list || []).map((x) => String(x).toUpperCase()));
  return required.every((r) => set.has(String(r).toUpperCase()));
}

function isPremium(d) {
  const r = PREMIUM_RULES;
  return (
    Number.isFinite(d.mc) &&
    Number.isFinite(d.holders) &&
    Number.isFinite(d.devHold) &&
    Number.isFinite(d.top10) &&
    d.mc <= r.maxMc &&
    d.holders >= r.minHolders &&
    d.devHold === r.devHoldExact &&
    d.top10 > r.minTop10Strict &&
    hasAllSocials(d.socials, r.requireSocials)
  );
}

function isStar(d) {
  const r = STAR_RULES;
  return (
    Number.isFinite(d.mc) &&
    Number.isFinite(d.holders) &&
    Number.isFinite(d.devHold) &&
    d.mc >= r.minMc &&
    d.mc <= r.maxMc &&
    d.holders >= r.minHolders &&
    d.devHold === r.devHoldExact
  );
}

function isMoon(d) {
  const r = MOON_RULES;
  return (
    Number.isFinite(d.mc) &&
    Number.isFinite(d.holders) &&
    Number.isFinite(d.devHold) &&
    Number.isFinite(d.top10) &&
    d.mc >= r.minMc &&
    d.mc <= r.maxMc &&
    d.holders >= r.minHolders &&
    d.devHold <= r.maxDevHold &&
    d.top10 > r.minTop10Strict
  );
}

/** -------------------- EXPORTS -------------------- **/
export function axioscanPremiumHandler({ sourceName, text }) {
  const raw = String(text ?? '').trim();
  if (!raw || shouldSkipCommon(raw)) return null;

  const d = parseAxi(raw);
  if (!isPremium(d)) return null;

  const cleaned = stripFooter(raw);
  if (!cleaned) return null;

  return {
    target: 'premium',
    text: `${cleaned}`.trim(),
  };
}

export function axioscanFreeHandler({ sourceName, text }) {
  const raw = String(text ?? '').trim();
  if (!raw || shouldSkipCommon(raw)) return null;

  const d = parseAxi(raw);

  const cleaned = stripFooter(raw);
  if (!cleaned) return null;

  if (isStar(d)) {
    return { target: 'star', text: `${cleaned}`.trim() };
  }

  if (isMoon(d)) {
    return { target: 'moon', text: `${cleaned}`.trim() };
  }

  return { target: 'others', text: `${cleaned}`.trim() };
}
