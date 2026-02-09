
import { createPublicClient, http } from 'viem';
import { localhost } from 'viem/chains';

const TARGET_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

async function main() {
    const client = createPublicClient({
        chain: localhost,
        transport: http("http://127.0.0.1:8545")
    });

    const code = await client.getBytecode({ address: TARGET_ADDRESS });
    console.log(`Code at ${TARGET_ADDRESS}:`, code ? code.slice(0, 50) + "..." : "None");
}

main();
