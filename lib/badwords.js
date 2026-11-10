// Isi sesuai kebutuhan komunitasmu (huruf kecil).
// Kata >= 5 huruf juga dicek sebagai substring, kata pendek hanya cocok per token utuh.
export const BAD_WORDS = [
  'anjing',
  'bangsat',
  'bajingan',
  'kontol',
  'memek',
  'ngentot',
  'goblok',
  'tolol',
  'babi',
  'asu',
];

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

function normalize(text) {
  const lowered = String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '');
  let out = '';
  for (const ch of lowered) out += LEET[ch] ?? ch;
  return out;
}

// "aaanjiiing" -> "anjing"
const collapse = (s) => s.replace(/(.)\1+/g, '$1');

const WORDS = BAD_WORDS.map((w) => collapse(normalize(w)));

export function containsBadWord(text) {
  const tokens = normalize(text)
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map(collapse);
  return tokens.some((token) => WORDS.some((w) => token === w || (w.length >= 5 && token.includes(w))));
}