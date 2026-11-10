import { SHEETS_TIMEOUT_MS } from './limits';

// PENTING: urutan kolom dan nilai kunci (event_id, tanggal_event, nomor)
// harus IDENTIK dengan baris yang dibuat lib/archive.js di Admin,
// supaya arsip nanti mengenali baris ini sebagai duplikat dan melewatinya.
// Kolom: event_id, tanggal_event, nomor, nama_event, nama, discord, whatsapp, catatan, tanggal_daftar, diarsipkan_pada
export function buildRow({ event, number, name, discord, whatsapp, note, createdAt }) {
  return [
    event.id,
    event.date,
    number,
    event.name,
    name,
    discord,
    whatsapp,
    note,
    createdAt,
    '', // diarsipkan_pada: kosong, diisi hanya oleh arsip
  ];
}

// Catat alasan gagal ke log server, lalu kembalikan hasil gagal
function fail(error, detail) {
  console.error('[sheets]', error, detail ?? '');
  return { ok: false, error };
}

/** Kirim 1 baris ke Google Sheets. TIDAK pernah melempar error. */
export async function sendRegistrationToSheets(row) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  const token = process.env.SHEETS_WEBHOOK_TOKEN;
  if (!url) return fail('SHEETS_WEBHOOK_URL belum diset (restart dev server setelah ubah .env.local).');
  if (!token) return fail('SHEETS_WEBHOOK_TOKEN belum diset.');
  if (!url.endsWith('/exec')) {
    return fail('SHEETS_WEBHOOK_URL harus berakhiran /exec, bukan /dev.', url);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, rows: [row] }),
      signal: AbortSignal.timeout(SHEETS_TIMEOUT_MS),
      redirect: 'follow',
      cache: 'no-store',
    });

    const text = await response.text();
    if (!response.ok) return fail(`Sheets membalas status ${response.status}.`, text.slice(0, 200));

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return fail(
        'Respons Sheets bukan JSON (biasanya akses deployment bukan "Anyone", belum diotorisasi, atau URL salah).',
        text.slice(0, 200),
      );
    }

    if (!body?.ok) return fail(`Apps Script menolak: ${body?.error ?? 'tanpa pesan (cek token)'}.`, JSON.stringify(body));
    if (body.received !== 1) return fail('Jumlah baris diterima tidak sesuai.', JSON.stringify(body));

    return { ok: true };
  } catch (err) {
    return fail(
      err?.name === 'TimeoutError' ? 'Sheets tidak merespons (timeout).' : 'Gagal menghubungi Google Sheets.',
      err?.message,
    );
  }
}