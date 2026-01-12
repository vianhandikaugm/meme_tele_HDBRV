import 'dotenv/config';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';

import { HANDLERS, SOURCE_NAMES } from './handlers.js';

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const stringSession = process.env.TG_STRING_SESSION;

const TARGET = {
  mid_cap: process.env.TARGET_MID_CAP_BUILDING,
  good_holders: process.env.TARGET_GOOD_HOLDERS_ENTRY,
  low_holders: process.env.TARGET_LOW_HOLDERS_EARLY,
  others: process.env.TARGET_OTHERS_CA,
};

const FORWARD_DELAY_MS = Number(process.env.FORWARD_DELAY_MS ?? '1200');
const DEBUG = process.env.DEBUG_LOG === '1';

if (!apiId || !apiHash || !stringSession) {
  throw new Error('Missing TG_API_ID / TG_API_HASH / TG_STRING_SESSION');
}
if (
  !TARGET.mid_cap ||
  !TARGET.good_holders ||
  !TARGET.low_holders ||
  !TARGET.others
) {
  throw new Error('Missing TARGET_* env');
}

const SOURCE_IDS = new Set(Object.keys(SOURCE_NAMES));

let queue = Promise.resolve();
const enqueue = (fn) =>
  (queue = queue.then(fn).catch((e) => console.error('Queue error:', e)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const seen = new Set();
const dedupeKey = (sourceId, msgId) => `${sourceId}:${msgId}`;

// For SOURCE filtering only (GramJS: supergroup => Channel)
function toBotApiChatId(chat) {
  if (!chat?.id) return null;

  const idStr =
    typeof chat.id === 'bigint' ? chat.id.toString() : String(chat.id);
  if (idStr.startsWith('-100')) return idStr;

  const abs = idStr.startsWith('-') ? idStr.slice(1) : idStr;

  if (chat.className === 'Channel' || chat.className === 'ChannelForbidden')
    return `-100${abs}`;
  if (chat.className === 'Chat') return `-${abs}`;

  return idStr;
}

function normalizeOut(out) {
  if (!out) return null;

  if (typeof out === 'string') return { target: 'others', text: out };

  if (typeof out === 'object' && typeof out.text === 'string') {
    const t = String(out.target ?? '').toLowerCase();

    if (
      t === 'mid_cap' ||
      t === 'good_holders' ||
      t === 'low_holders' ||
      t === 'others'
    ) {
      return { target: t, text: out.text };
    }

    // legacy
    if (t === 'premium') return { target: 'mid_cap', text: out.text };
    if (t === 'moon') return { target: 'good_holders', text: out.text };
    if (t === 'star') return { target: 'low_holders', text: out.text };

    return { target: 'others', text: out.text };
  }

  return null;
}

async function buildEntityMap(client) {
  const dialogs = await client.getDialogs({ limit: 500 });

  const map = new Map();
  for (const d of dialogs) {
    const e = d.entity;
    if (!e?.id) continue;

    const id = typeof e.id === 'bigint' ? e.id.toString() : String(e.id);

    map.set(id, e);
    map.set(`-${id}`, e);
    map.set(`-100${id}`, e);
  }
  return map;
}

function pickEntity(map, chatId) {
  const key = String(chatId).trim();
  const ent = map.get(key);
  if (!ent)
    throw new Error(`Target entity not found in dialogs for chatId=${key}`);
  return ent;
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

  const entityMap = await buildEntityMap(client);
  const TARGET_ENTITY = {
    mid_cap: pickEntity(entityMap, TARGET.mid_cap),
    good_holders: pickEntity(entityMap, TARGET.good_holders),
    low_holders: pickEntity(entityMap, TARGET.low_holders),
    others: pickEntity(entityMap, TARGET.others),
  };

  console.log('✅ Target entities loaded from dialogs');

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message) return;

    const text = message.message;
    if (!text || !text.trim()) return;

    const chat = await message.getChat();
    const sourceId = toBotApiChatId(chat);
    if (!sourceId) return;

    if (DEBUG) {
      console.log('📩 incoming', {
        chatTitle: chat?.title,
        className: chat?.className,
        rawChatId:
          typeof chat?.id === 'bigint' ? chat.id.toString() : String(chat?.id),
        sourceId,
        msgId: message.id,
      });
    }

    if (!SOURCE_IDS.has(sourceId)) return;

    const key = dedupeKey(sourceId, message.id);
    if (seen.has(key)) return;
    seen.add(key);

    const sourceName = SOURCE_NAMES[sourceId] ?? chat?.title ?? sourceId;
    const handler = HANDLERS[sourceId];
    if (!handler) return;

    let out;
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

    enqueue(async () => {
      const ent = TARGET_ENTITY[normalized.target] ?? TARGET_ENTITY.others;

      await client.sendMessage(ent, {
        message: normalized.text,
        linkPreview: false,
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
