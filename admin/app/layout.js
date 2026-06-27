import './globals.css';

export const metadata = {
  title: 'DreamDiary Admin',
  description: 'Internal admin dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
