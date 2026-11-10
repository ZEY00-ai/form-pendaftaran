import './globals.css';

export const metadata = {
  title: 'Pendaftaran Event',
  description: 'Form pendaftaran peserta event.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}