import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import SupabaseConfigScript from "@/components/supabase-config";
import { SimpleAuthProvider } from "@/contexts/simple-auth-context";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Galatea.AI - Your AI Wingman',
  description: 'Connect with sophisticated AI companions for meaningful conversations, emotional support, and confidence building.',
  generator: 'Galatea.AI',
  icons: {
    icon: [
      { url: '/favicon-light.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-light.png', sizes: '16x16', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-dark.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { url: '/favicon-dark.png', sizes: '16x16', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { url: '/favicon-light.png', sizes: '32x32', type: 'image/png' }, // fallback
    ],
    apple: [
      { url: '/favicon-light.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'icon',
        url: '/favicon-light.png',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-light.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-light.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-dark.png" media="(prefers-color-scheme: dark)" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-dark.png" media="(prefers-color-scheme: dark)" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-light.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon-light.png" />
        <SupabaseConfigScript />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <SimpleAuthProvider>
          {children}
          <Toaster />
        </SimpleAuthProvider>
      </body>
    </html>
  )
}
