
import { createPublicClient, http, parseAbi } from 'viem';
import { localhost } from 'viem/chains';

const USDC_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
const ACCOUNT = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; // Deployer

async function main() {
    const client = createPublicClient({
        chain: localhost,
        transport: http("http://127.0.0.1:8545")
    });

    const abi = parseAbi([
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
    ]);

    console.log(`Checking USDC at ${USDC_ADDRESS}...`);

    try {
        const symbol = await client.readContract({
            address: USDC_ADDRESS,
            abi,
            functionName: 'symbol'
        });
        console.log("Symbol:", symbol);
    } catch (e) { console.error("Symbol failed:", e.message); }

    try {
        const decimals = await client.readContract({
            address: USDC_ADDRESS,
            abi,
            functionName: 'decimals'
        });
        console.log("Decimals:", decimals);
    } catch (e) { console.error("Decimals failed:", e.message); }

    try {
        const bal = await client.readContract({
            address: USDC_ADDRESS,
            abi,
            functionName: 'balanceOf',
            args: [ACCOUNT]
        });
        console.log("Balance:", bal.toString());
    } catch (e) { console.error("Balance failed:", e.message); }
}

main();
