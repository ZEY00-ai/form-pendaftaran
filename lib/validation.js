import { containsBadWord } from './badwords';
import { LIMITS } from './limits';

const NAME_RE = /^[\p{L}\p{M} .'’-]+$/u;
const DISCORD_RE = /^[a-z0-9_.]+$/;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

// Terima 08..., 628..., +628... -> "+628xxxxxxxx". Selain itu null.
export function normalizeWhatsapp(raw) {
  const cleaned = String(raw ?? '').replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(cleaned)) return null;

  let rest;
  if (cleaned.startsWith('+62')) rest = cleaned.slice(3);
  else if (cleaned.startsWith('62')) rest = cleaned.slice(2);
  else if (cleaned.startsWith('0')) rest = cleaned.slice(1);
  else return null;

  return /^8\d{8,11}$/.test(rest) ? `+62${rest}` : null;
}

/**
 * @param input  { name, discord, eventId, whatsapp, note } mentah dari form
 * @param events array event dari Redis
 * @param now    Date "sekarang" (dioper supaya mudah diuji)
 * @returns { ok, errors, values, data }
 */
export function validateRegistration(input, events, now = new Date()) {
  const values = {
    name: String(input.name ?? '').normalize('NFC').replace(/\s+/g, ' ').trim(),
    discord: String(input.discord ?? '').trim().replace(/^@/, '').toLowerCase(),
    eventId: String(input.eventId ?? '').trim(),
    whatsapp: String(input.whatsapp ?? '').trim(),
    note: String(input.note ?? '').replace(/\r\n?/g, '\n').trim(),
  };
  const errors = {};

  // Nama
  if (!values.name) errors.name = 'Nama wajib diisi.';
  else if (values.name.length < LIMITS.NAME_MIN || values.name.length > LIMITS.NAME_MAX)
    errors.name = `Nama harus ${LIMITS.NAME_MIN}-${LIMITS.NAME_MAX} karakter.`;
  else if (!NAME_RE.test(values.name) || !/\p{L}/u.test(values.name))
    errors.name = 'Nama hanya boleh huruf, spasi, titik, apostrof, dan tanda hubung.';
  else if (containsBadWord(values.name)) errors.name = 'Nama mengandung kata yang tidak diperbolehkan.';

  // Username Discord
  if (!values.discord) errors.discord = 'Username Discord wajib diisi.';
  else if (values.discord.length < LIMITS.DISCORD_MIN || values.discord.length > LIMITS.DISCORD_MAX)
    errors.discord = `Username harus ${LIMITS.DISCORD_MIN}-${LIMITS.DISCORD_MAX} karakter.`;
  else if (!DISCORD_RE.test(values.discord) || values.discord.includes('..'))
    errors.discord = 'Username hanya boleh a-z, 0-9, "_" dan "." (tanpa titik beruntun).';

  // Event
  const event = events.find((e) => e.id === values.eventId);
  if (!event) errors.eventId = 'Pilih event yang valid.';
  else if (!event.open) errors.eventId = 'Pendaftaran event ini sudah ditutup.';
  else if (new Date(event.date) <= now) errors.eventId = 'Event ini sudah lewat.';

  // WhatsApp (opsional)
  let whatsapp = '';
  if (values.whatsapp) {
    whatsapp = normalizeWhatsapp(values.whatsapp);
    if (!whatsapp) errors.whatsapp = 'Format nomor tidak valid. Contoh: 081234567890.';
  }

  // Catatan (opsional)
  if (values.note.length > LIMITS.NOTE_MAX) errors.note = `Catatan maksimal ${LIMITS.NOTE_MAX} karakter.`;
  else if (CONTROL_RE.test(values.note)) errors.note = 'Catatan mengandung karakter yang tidak diperbolehkan.';
  else if (values.note && containsBadWord(values.note))
    errors.note = 'Catatan mengandung kata yang tidak diperbolehkan.';

  if (Object.keys(errors).length > 0) return { ok: false, errors, values, data: null };

  return {
    ok: true,
    errors: {},
    values,
    data: { event, name: values.name, discord: values.discord, whatsapp, note: values.note },
  };
}