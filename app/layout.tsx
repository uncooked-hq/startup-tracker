import type { Metadata } from 'next'
import { Instrument_Serif } from 'next/font/google'
import './globals.css'

// Google Font: Instrument Serif
const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'uncooked | startup tracker',
  description: 'aggregated startup job listings from 30+ sources',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={instrumentSerif.variable}>
      <head>
        {/* Fontshare: Satoshi (not available in next/font) */}
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
