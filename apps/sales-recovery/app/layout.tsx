import React from 'react';

export const metadata = {
  title: 'N-LINK 360 - Sales Recovery App',
  description: 'Enterprise Field Force Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
