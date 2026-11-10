'use server';

import { revalidatePath } from 'next/cache';
import { deleteDiscordMessage, sendRegistrationToDiscord } from '@/lib/discord';
import { formatRegistrationNumber } from '@/lib/format';
import { buildRow, sendRegistrationToSheets } from '@/lib/sheets';
import { getEvents, releaseSlot, reserveSlot } from '@/lib/storage';
import { validateRegistration } from '@/lib/validation';

const fail = (message, values, errors = {}) => ({ success: false, message, errors, values });

// Rollback slot: tidak boleh melempar error
async function rollback(eventId, discord, number) {
  try {
    await releaseSlot(eventId, discord, number);
  } catch (err) {
    console.error('Rollback slot gagal:', err);
  }
}

export async function registerAction(_prev, formData) {
  const input = {
    name: formData.get('name'),
    discord: formData.get('discord'),
    eventId: formData.get('eventId'),
    whatsapp: formData.get('whatsapp'),
    note: formData.get('note'),
  };

  // 1. Ambil event dari Redis lalu validasi
  let events;
  try {
    events = await getEvents();
  } catch (err) {
    console.error(err);
    return fail('Server sedang bermasalah. Coba lagi sebentar lagi.', {
      name: String(input.name ?? ''),
      discord: String(input.discord ?? ''),
      eventId: String(input.eventId ?? ''),
      whatsapp: String(input.whatsapp ?? ''),
      note: String(input.note ?? ''),
    });
  }

  const result = validateRegistration(input, events, new Date());
  if (!result.ok) return fail('Periksa isian yang ditandai.', result.values, result.errors);

  const { event, name, discord, whatsapp, note } = result.data;
  const createdAt = new Date().toISOString();

  // 2. Ambil slot secara atomik
  let slot;
  try {
    slot = await reserveSlot(event, {
      eventId: event.id,
      name,
      discord,
      whatsapp,
      note,
      createdAt,
    });
  } catch (err) {
    console.error(err);
    return fail('Server sedang bermasalah. Pendaftaran belum tercatat, coba lagi.', result.values);
  }

  if (slot.status === 'duplicate') {
    return fail('Username Discord ini sudah terdaftar di event tersebut.', result.values, {
      discord: 'Username ini sudah terdaftar.',
    });
  }
  if (slot.status === 'full') {
    return fail('Maaf, kuota event ini sudah penuh.', result.values, {
      eventId: 'Kuota event ini sudah penuh.',
    });
  }

  const remaining = Math.max(event.quota - slot.count, 0);

  // 3. Discord (pesan singkat + sisa slot). Gagal -> rollback
  const discordResult = await sendRegistrationToDiscord({
    number: slot.number,
    event,
    name,
    discord,
    note,
    remaining,
  });
  if (!discordResult.ok) {
    await rollback(event.id, discord, slot.number);
    return fail('Pendaftaran gagal: notifikasi Discord tidak terkirim. Silakan coba lagi.', result.values);
  }

  // 4. Google Sheets (data lengkap + WhatsApp). Dikirim terakhir karena baris sheet tidak bisa ditarik.
  //    Gagal -> hapus pesan Discord (best-effort) lalu rollback
  const sheetsResult = await sendRegistrationToSheets(
    buildRow({ event, number: slot.number, name, discord, whatsapp, note, createdAt }),
  );
  if (!sheetsResult.ok) {
    await deleteDiscordMessage(discordResult.messageId);
    await rollback(event.id, discord, slot.number);
    return fail('Pendaftaran gagal: data belum tersimpan ke spreadsheet. Silakan coba lagi.', result.values);
  }

  // 5. Sukses
  revalidatePath('/');
  return {
    success: true,
    message: `Pendaftaran berhasil! Nomor kamu ${formatRegistrationNumber(slot.number)}. Sampai jumpa di ${event.name}!`,
    errors: {},
    values: { name: '', discord: '', eventId: '', whatsapp: '', note: '' },
  };
}