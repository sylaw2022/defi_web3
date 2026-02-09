
import { createPublicClient, http, parseAbi } from 'viem';
import { localhost } from 'viem/chains';

const WETH_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3"; // Default Hardhat addr
const ACCOUNT = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; // Deployer
const LENDING_PROTOCOL = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";

async function main() {
    console.log(`Debugging WETH at ${WETH_ADDRESS}...`);

    const client = createPublicClient({
        chain: localhost,
        transport: http("http://127.0.0.1:8545")
    });

    // Check code existance first
    const code = await client.getBytecode({ address: WETH_ADDRESS });
    console.log("Code exists:", !!code && code.length > 2);
    if (!code || code.length <= 2) {
        console.error("NO CODE AT ADDRESS!");
        return;
    }

    const abi = parseAbi([
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address, address) view returns (uint256)"
    ]);

    const calls = [
        { name: 'name', args: [] },
        { name: 'symbol', args: [] },
        { name: 'decimals', args: [] },
        { name: 'totalSupply', args: [] },
        { name: 'balanceOf', args: [ACCOUNT] },
        { name: 'allowance', args: [ACCOUNT, LENDING_PROTOCOL] }
    ];

    for (const call of calls) {
        try {
            const res = await client.readContract({
                address: WETH_ADDRESS,
                abi,
                functionName: call.name,
                args: call.args
            });
            console.log(`[SUCCESS] ${call.name}:`, res.toString());
        } catch (e) {
            console.error(`[FAILED] ${call.name}:`, e.message.split('\n')[0]);
        }
    }
}

main();
