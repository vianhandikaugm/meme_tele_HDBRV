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
