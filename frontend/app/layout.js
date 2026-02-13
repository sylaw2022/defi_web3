import './globals.css'
import { Providers } from './providers'

export const metadata = {
    title: 'DeFi Lending Protocol',
    description: 'A decentralized lending protocol frontend',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
