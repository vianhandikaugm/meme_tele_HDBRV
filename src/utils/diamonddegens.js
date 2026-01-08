function isEmojiWallLine(line) {
  const t = (line ?? '').trim();
  if (!t) return false;

  const onlyEmoji = /^[\p{Extended_Pictographic}\uFE0F\u200D\s]+$/u.test(t);
  if (!onlyEmoji) return false;

  const emojiCount = (t.match(/\p{Extended_Pictographic}/gu) || []).length;
  return emojiCount >= 8;
}

export function diamondDegensHandler({ sourceName, text }) {
  let cleaned = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return null;

  cleaned = cleaned
    .split('\n')
    .filter((line) => !isEmojiWallLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return null;

  const isResult = /\b\d+(?:\.\d+)?x\b/i.test(cleaned);

  return {
    target: isResult ? 'result' : 'calls',
    text: `💎 ${sourceName}\n\n${cleaned}`.trim(),
  };
}
