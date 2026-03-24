import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata = { title: 'DJ IMPERIALS System' };
export default function RootLayout({ children }) {
  return <html lang="en" className={poppins.className}><body>{children}</body></html>;
}
