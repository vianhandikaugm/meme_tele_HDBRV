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

export function axioscanPremiumHandler({ sourceName, text }) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;

  const holdersMatch = raw.match(/Holders:\s*([\d,]+)/i);
  const top10Match = raw.match(
    /Top\s*10\s*Holders\s*:\s*(?:Σ\s*)?(\d+(?:\.\d+)?)\s*%/i
  );
  const devHoldMatch = raw.match(/Dev\s*hold\s*:\s*(\d+(?:\.\d+)?)\s*%/i);

  const holders = holdersMatch
    ? Number(String(holdersMatch[1]).replace(/,/g, ''))
    : NaN;

  const top10 = top10Match ? Number(top10Match[1]) : NaN;
  const devHold = devHoldMatch ? Number(devHoldMatch[1]) : NaN;

  if (!Number.isFinite(holders) || !Number.isFinite(top10)) return null;

  // filter premium
  if (holders < 100) return null;
  if (top10 < 20) return null;
  if (!Number.isFinite(devHold)) return null;
  if (devHold !== 0) return null;

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
