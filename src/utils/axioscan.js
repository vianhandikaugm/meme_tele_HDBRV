export function axioscanFreeHandler({ sourceName, text }) {
  const raw = String(text ?? '').trim();

  if (/VIP\s*access:\s*@axioinvite_bot/i.test(raw)) return null;

  if (
    /^info\s+bonk\s+here\s*:?\s*https?:\/\/t\.me\/axioscan\/\d+\s*$/i.test(raw)
  )
    return null;

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
  if (communityPromo.some((rx) => rx.test(raw))) return null;

  const cleaned = raw
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return null;

  const isGrowth = /\bGrowth:\s*x\d+(?:\.\d+)?\b/i.test(cleaned);

  return {
    target: isGrowth ? 'result' : 'calls',
    text: `🧪 ${sourceName}\n\n${cleaned}`.trim(),
  };
}

// PREMIUM //

function toNumberEnv(value, fallback) {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) ? n : fallback;
}

const PREMIUM_CFG = {
  maxDevHold: toNumberEnv(process.env.PREMIUM_MAX_DEV_HOLD, 3),
  minHolders: toNumberEnv(process.env.PREMIUM_MIN_HOLDERS, 80),
  minTop10: toNumberEnv(process.env.PREMIUM_MIN_TOP10, 20),
  maxMc: toNumberEnv(process.env.PREMIUM_MAX_MC, 25_000),
};

function parseMoneyToNumber(str) {
  if (!str) return NaN;
  const s = String(str)
    .replace(/[$,\s]/g, '')
    .toUpperCase();
  const m = s.match(/^(\d+(?:\.\d+)?)([KM])?$/);
  if (!m) return NaN;

  const base = Number(m[1]);
  const suffix = m[2];
  if (!Number.isFinite(base)) return NaN;

  if (suffix === 'K') return base * 1_000;
  if (suffix === 'M') return base * 1_000_000;
  return base;
}

export function axioscanPremiumHandler({ sourceName, text }) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;

  const holdersMatch = raw.match(/Holders:\s*([\d,]+)/i);
  const top10Match = raw.match(
    /Top\s*10\s*Holders\s*:\s*(?:Σ\s*)?(\d+(?:\.\d+)?)\s*%/i
  );
  const devHoldMatch = raw.match(/Dev\s*hold\s*:\s*(\d+(?:\.\d+)?)\s*%/i);
  const mcMatch = raw.match(
    /(?:MC|Market\s*Cap)\s*:\s*\$?\s*([\d.,]+\s*[KM]?)/i
  );

  const holders = holdersMatch
    ? Number(String(holdersMatch[1]).replace(/,/g, ''))
    : NaN;
  const top10 = top10Match ? Number(top10Match[1]) : NaN;
  const devHold = devHoldMatch ? Number(devHoldMatch[1]) : NaN;
  const mc = mcMatch ? parseMoneyToNumber(mcMatch[1]) : NaN;

  if (!Number.isFinite(holders)) return null;
  if (!Number.isFinite(top10)) return null;
  if (!Number.isFinite(devHold)) return null;
  if (!Number.isFinite(mc)) return null;

  if (devHold > PREMIUM_CFG.maxDevHold) return null;
  if (holders < PREMIUM_CFG.minHolders) return null;
  if (top10 < PREMIUM_CFG.minTop10) return null;
  if (mc > PREMIUM_CFG.maxMc) return null;

  const cleaned = raw
    .replace(/\r\n/g, '\n')
    .replace(/\(\s*https?:\/\/[^)]+\)/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/^\s*Follow\s+@AXIOSCAN\s*$/gim, '')
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/\s*·\s*/g, ' · ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return null;

  return {
    target: 'premium',
    text: `🧪 ${sourceName}\n\n${cleaned}`.trim(),
  };
}
