import RegistrationForm from '@/components/RegistrationForm';
import { formatEventDate } from '@/lib/format';
import { getEvents, getRegistrantCounts } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let options = [];
  let loadError = false;

  try {
    const now = new Date();
    // Hanya event yang dibuka dan belum lewat
    const events = (await getEvents()).filter((e) => e.open && new Date(e.date) > now);
    const counts = await getRegistrantCounts(events);

    options = events.map((e) => {
      const remaining = Math.max(e.quota - (counts[e.id] ?? 0), 0);
      const full = remaining === 0;
      return {
        id: e.id,
        full,
        label: full
          ? `${e.name} — ${formatEventDate(e.date)} (Penuh)`
          : `${e.name} — ${formatEventDate(e.date)} (sisa ${remaining})`,
      };
    });
  } catch {
    loadError = true;
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Pendaftaran Event</h1>
      <p className="mt-1 text-sm text-zinc-400">Isi data di bawah untuk mengamankan slotmu.</p>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
        {loadError ? (
          <p className="text-sm text-red-400">Gagal memuat daftar event. Coba muat ulang halaman.</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-zinc-400">Belum ada event yang dibuka untuk pendaftaran.</p>
        ) : (
          <RegistrationForm options={options} />
        )}
      </div>
    </main>
  );
}