export function villaninousHatHandler({ sourceName, text }) {
  const cleaned = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return null;

  const isMultiplier = /\b\d+(?:\.\d+)?x\b/i.test(cleaned);

  if (isMultiplier) return null;

  return {
    target: 'hat',
    text: `🎩 ${sourceName}\n\n${cleaned}`.trim(),
  };
}
