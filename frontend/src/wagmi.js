import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'

const hardhatChain = {
    id: 31337,
    name: 'Hardhat Localhost',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: { http: ['http://127.0.0.1:8545'] },
        public: { http: ['http://127.0.0.1:8545'] },
    },
    contracts: {
        multicall3: undefined
    }
}

export const config = createConfig({
    chains: [hardhatChain],
    connectors: [
        injected(),
    ],
    batch: {
        multicall: false,
    },
    transports: {
        [hardhatChain.id]: http('http://127.0.0.1:8545', {
            batch: false
        }),
    },
})
