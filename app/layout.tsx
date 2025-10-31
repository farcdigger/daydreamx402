import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Token Presale - Base Network',
  description: 'Pay $5 USDC to participate in token presale',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

