import '../styles/globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import Script from 'next/script'

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Component {...pageProps} />
    </AuthProvider>
  )
}
