import { Redis } from '@upstash/redis';

let client;
function getRedis() {
  if (!client) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN belum diset.');
    client = new Redis({ url, token });
  }
  return client;
}

const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value);

const EVENTS_KEY = 'events';

// HARUS sama persis dengan Admin Dashboard.
const regKeys = (id) => ({
  members: `reg:{${id}}:members`,
  data: `reg:{${id}}:data`,
  counter: `reg:{${id}}:counter`,
  free: `reg:{${id}}:free`,
});

// ---------- event ----------
export async function getEvents() {
  const all = await getRedis().hgetall(EVENTS_KEY);
  if (!all) return [];
  return Object.values(all)
    .map(parseJson)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** { [eventId]: jumlahPendaftar } */
export async function getRegistrantCounts(events) {
  if (events.length === 0) return {};
  const pipeline = getRedis().pipeline();
  for (const event of events) pipeline.hlen(regKeys(event.id).members);
  const counts = await pipeline.exec();
  return Object.fromEntries(events.map((event, i) => [event.id, Number(counts[i])]));
}

// ---------- slot (atomik) ----------
// KEYS: members, data, counter, free | ARGV: username, kuota, jsonData
const RESERVE_SCRIPT = `
if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 1 then
  return {'duplicate', 0, 0}
end
local count = redis.call('HLEN', KEYS[1])
if count >= tonumber(ARGV[2]) then
  return {'full', 0, count}
end
local n
local popped = redis.call('ZPOPMIN', KEYS[4])
if #popped > 0 then
  n = tonumber(popped[1])
else
  n = redis.call('INCR', KEYS[3])
end
redis.call('HSET', KEYS[1], ARGV[1], n)
redis.call('HSET', KEYS[2], tostring(n), ARGV[3])
return {'ok', n, count + 1}
`;

/**
 * @returns { status: 'ok', number, count } | { status: 'duplicate' } | { status: 'full' }
 * count = jumlah pendaftar SETELAH slot ini diambil.
 */
export async function reserveSlot(event, record) {
  const k = regKeys(event.id);
  const [status, number, count] = await getRedis().eval(
    RESERVE_SCRIPT,
    [k.members, k.data, k.counter, k.free],
    [record.discord, event.quota, JSON.stringify(record)],
  );
  if (status === 'ok') return { status: 'ok', number: Number(number), count: Number(count) };
  return { status };
}

// KEYS: members, data, free | ARGV: username, nomor
// Hanya melepas jika username masih memegang nomor tsb. Nomor dipakai ulang lebih dulu (bukan DECR).
const RELEASE_SCRIPT = `
local current = redis.call('HGET', KEYS[1], ARGV[1])
if tostring(current) ~= ARGV[2] then
  return 0
end
redis.call('HDEL', KEYS[1], ARGV[1])
redis.call('HDEL', KEYS[2], ARGV[2])
redis.call('ZADD', KEYS[3], tonumber(ARGV[2]), ARGV[2])
return 1
`;

export async function releaseSlot(eventId, discord, number) {
  const k = regKeys(eventId);
  const released = await getRedis().eval(
    RELEASE_SCRIPT,
    [k.members, k.data, k.free],
    [discord, String(number)],
  );
  return released === 1;
}