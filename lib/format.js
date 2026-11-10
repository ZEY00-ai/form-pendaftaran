// Nomor pendaftaran: 1 -> "#001"
export function formatRegistrationNumber(number) {
  return `#${String(number).padStart(3, '0')}`;
}

// Tanggal event ISO (+07:00) -> teks WIB yang mudah dibaca
export function formatEventDate(iso) {
  const text = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso));
  return `${text} WIB`;
}

// Escape markdown Discord dan netralkan "@" supaya tidak ada ping
export function escapeDiscord(text) {
  return String(text ?? '')
    .replace(/([\\`*_~|>[\]()#])/g, '\\$1')
    .replace(/@/g, '@\u200b');
}