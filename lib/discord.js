import { DISCORD_TIMEOUT_MS } from './limits';
import { escapeDiscord, formatEventDate, formatRegistrationNumber } from './format';

// URL webhook tanpa query string
function baseWebhookUrl() {
  const raw = process.env.DISCORD_WEBHOOK_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    u.search = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

/**
 * Kirim notifikasi pendaftaran ke Discord. TIDAK pernah melempar error.
 * Nomor WhatsApp sengaja tidak dikirim (privasi).
 * @returns { ok: true, messageId } | { ok: false, error }
 */
export async function sendRegistrationToDiscord({ number, event, name, discord, note, remaining }) {
  const base = baseWebhookUrl();
  if (!base) return { ok: false, error: 'DISCORD_WEBHOOK_URL belum diset atau tidak valid.' };

  const slotText =
    remaining > 0
      ? `Sisa slot: **${remaining}** dari ${event.quota}`
      : `**Slot penuh** (${event.quota}/${event.quota})`;

  const fields = [
    { name: 'Event', value: escapeDiscord(event.name).slice(0, 200), inline: false },
    { name: 'Tanggal', value: escapeDiscord(formatEventDate(event.date)), inline: false },
    { name: 'Username Discord', value: `\`${discord.replace(/`/g, '')}\``, inline: true },
    { name: 'Nomor', value: formatRegistrationNumber(number), inline: true },
  ];
  if (note) fields.push({ name: 'Catatan', value: escapeDiscord(note).slice(0, 1000), inline: false });

  const payload = {
    username: 'Pendaftaran Event',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `${formatRegistrationNumber(number)} ${escapeDiscord(name)} sudah mendaftar`.slice(0, 250),
        description: slotText,
        color: remaining > 0 ? 0x22c55e : 0xef4444,
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    // wait=true: Discord membalas dengan data pesan (termasuk id) supaya bisa dihapus saat rollback
    const response = await fetch(`${base}?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) return { ok: false, error: `Discord membalas status ${response.status}.` };

    let messageId = null;
    try {
      messageId = (await response.json())?.id ?? null;
    } catch {
      // respons tanpa body tetap dianggap terkirim
    }
    return { ok: true, messageId };
  } catch (err) {
    return {
      ok: false,
      error: err?.name === 'TimeoutError' ? 'Discord tidak merespons (timeout).' : 'Gagal menghubungi Discord.',
    };
  }
}

/** Hapus pesan yang sudah terkirim (rollback). Best-effort, tidak pernah melempar error. */
export async function deleteDiscordMessage(messageId) {
  const base = baseWebhookUrl();
  if (!base || !messageId) return { ok: false };
  try {
    const response = await fetch(`${base}/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
      cache: 'no-store',
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}