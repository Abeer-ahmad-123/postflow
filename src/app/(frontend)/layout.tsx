import React from 'react'
import './styles.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata = {
  description: 'Internal topic and post workflow tracking built with Next.js and Payload.',
  icons: {
    apple: [{ type: 'image/svg+xml', url: '/apple-icon.svg' }],
    icon: [{ type: 'image/svg+xml', url: '/icon.svg' }],
  },
  title: 'Postflow',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
