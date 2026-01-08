export async function sendToTelegramChannel({ botToken, chatId, text }) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok !== true) {
    throw new Error(
      `sendMessage failed: ${res.status} ${JSON.stringify(json)}`
    );
  }
}
