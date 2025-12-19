import './globals.css'
import { Outfit } from 'next/font/google'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata = {
  title: 'SpinStack',
  description: 'Your personal vinyl collection manager',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body className={outfit.className}>
        {children}
        <footer className="border-t border-gray-800 py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
            <p>SpinStack &copy; {new Date().getFullYear()} - Your vinyl collection, reimagined</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
