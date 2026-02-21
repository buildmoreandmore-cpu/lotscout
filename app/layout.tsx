import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Assistant from '@/components/Assistant'

export const metadata: Metadata = {
  title: 'LotScout — Infill Lot Prospector',
  description: 'Find, score, and manage infill lot deals in the Atlanta metro area',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-[100dvh] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-950 px-4 py-4 md:px-6 md:py-6 pt-[72px] md:pt-6">
          {children}
        </main>
        <Assistant />
      </body>
    </html>
  )
}
