import 'dotenv/config';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';

import { sendToTelegramChannel } from './botSender.js';
import { HANDLERS, SOURCE_NAMES } from './handlers.js';

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const stringSession = process.env.TG_STRING_SESSION;

const botToken = process.env.BOT_TOKEN;
const targetCallsId = process.env.TARGET_CHANNEL_CALLS;
const targetResultId = process.env.TARGET_CHANNEL_RESULT;

const FORWARD_DELAY_MS = Number(process.env.FORWARD_DELAY_MS ?? '1200');

if (!apiId || !apiHash || !stringSession) {
  throw new Error(
    'Missing TG_API_ID / TG_API_HASH / TG_STRING_SESSION in .env'
  );
}

if (!botToken || !targetCallsId || !targetResultId) {
  throw new Error(
    'Missing BOT_TOKEN / TARGET_CHANNEL_CALLS / TARGET_CHANNEL_RESULT in .env'
  );
}

const SOURCE_IDS = new Set(Object.keys(SOURCE_NAMES));

let queue = Promise.resolve();
function enqueue(fn) {
  queue = queue.then(fn).catch((e) => console.error('Queue error:', e));
  return queue;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const seen = new Set();
function dedupeKey({ sourceId, msgId }) {
  return `${sourceId}:${msgId}`;
}

function toBotApiChatId(chat) {
  if (!chat?.id) return null;

  const idStr =
    typeof chat.id === 'bigint' ? chat.id.toString() : String(chat.id);

  if (idStr.startsWith('-100')) return idStr;

  if (chat.className === 'Channel' || chat.className === 'ChannelForbidden') {
    return `-100${idStr}`;
  }

  return idStr.startsWith('-') ? idStr : idStr;
}

function normalizeOut(out) {
  if (!out) return null;

  if (typeof out === 'string') {
    return { target: 'calls', text: out };
  }

  if (typeof out === 'object' && typeof out.text === 'string') {
    const target = out.target === 'result' ? 'result' : 'calls';
    return { target, text: out.text };
  }

  return null;
}

async function main() {
  const client = new TelegramClient(
    new StringSession(stringSession),
    apiId,
    apiHash,
    {
      connectionRetries: 10,
    }
  );

  await client.connect();
  console.log('✅ Userbot connected. Listening...');

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message) return;

    const text = message.message;
    if (!text || !text.trim()) return;

    const chat = await message.getChat();
    const sourceId = toBotApiChatId(chat);
    if (!sourceId) return;

    if (!SOURCE_IDS.has(sourceId)) return;

    const msgId = message.id;
    const key = dedupeKey({ sourceId, msgId });
    if (seen.has(key)) return;
    seen.add(key);

    const sourceName = SOURCE_NAMES[sourceId] ?? chat?.title ?? sourceId;
    const handler = HANDLERS[sourceId];
    if (!handler) return;

    let out = null;
    try {
      out = await handler({
        sourceId,
        sourceName,
        chatTitle: chat?.title,
        text,
      });
    } catch (e) {
      console.error(`Handler error [${sourceName}]`, e);
      return;
    }

    const normalized = normalizeOut(out);
    if (!normalized) return;

    const targetChatId =
      normalized.target === 'result' ? targetResultId : targetCallsId;

    enqueue(async () => {
      await sendToTelegramChannel({
        botToken,
        chatId: targetChatId,
        text: normalized.text,
      });

      console.log(`➡️ forwarded [${normalized.target}] from ${sourceName}`);
      await sleep(FORWARD_DELAY_MS);
    });
  }, new NewMessage({}));
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
