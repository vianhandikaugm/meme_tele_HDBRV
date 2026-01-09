export function cHubAlertsHandler({ sourceName, text }) {
  const cleaned = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return null;

  if (/\bUPDATE\b/i.test(cleaned) || /Profile\s+updated/i.test(cleaned)) {
    return null;
  }

  const isResult = /\b\d+(?:\.\d+)?x\s*ALERT\b/i.test(cleaned);

  if (isResult) return null;

  return {
    target: 'hub',
    text: `📣 ${sourceName}\n\n${cleaned}`.trim(),
  };
}
