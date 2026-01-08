export function villaninousHatHandler({ sourceName, text }) {
  const cleaned = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return null;

  const isMultiplier = /\b\d+(?:\.\d+)?x\b/i.test(cleaned);

  return {
    target: isMultiplier ? 'result' : 'calls',
    text: `🎩 ${sourceName}\n\n${cleaned}`.trim(),
  };
}
