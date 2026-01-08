import 'dotenv/config';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;

if (!apiId || !apiHash) throw new Error('Set TG_API_ID & TG_API_HASH di .env');

const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
  connectionRetries: 5,
});

(async () => {
  await client.start({
    phoneNumber: async () =>
      await input.text('Phone number (ex: +62812xxxx): '),
    password: async () => await input.text('2FA password (kalau ada): '),
    phoneCode: async () => await input.text('OTP code: '),
    onError: (err) => console.error(err),
  });

  console.log('\n✅ LOGIN OK');
  console.log('Copy ini ke .env sebagai TG_STRING_SESSION:\n');
  console.log(client.session.save());
  process.exit(0);
})();
