import React from 'react';

export const metadata = {
  title: 'N-LINK 360 - Company Portal',
  description: 'Enterprise Headquarters Portal',
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
