/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sengaja TIDAK mengaktifkan cacheComponents / partialPrefetching
  // karena bentrok dengan `export const dynamic = 'force-dynamic'`.

  // Blok ini yang mengaktifkan Tailwind lewat @tailwindcss/turbopack. Jangan dihapus.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;