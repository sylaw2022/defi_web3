import { createPublicClient, http, parseAbi, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { localhost } from 'viem/chains';

const LENDING_PROTOCOL_ADDRESS = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";
const WETH_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const ABI = [
    "function balances(address user, address token) view returns (uint256)",
    "function deposit(address token, uint256 amount)",
    "function withdraw(address token, uint256 amount)",
    "function approve(address spender, uint256 amount) returns (bool)"
];

const MOCK_TOKEN_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount)"
];

const ACCOUNT_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Account 0

async function main() {
    const client = createPublicClient({
        chain: localhost,
        transport: http("http://127.0.0.1:8545")
    });

    // 1. Test 'balances' call
    const account = privateKeyToAccount(ACCOUNT_PK);
    console.log("Testing balances for:", account.address);

    try {
        const balance = await client.readContract({
            address: LENDING_PROTOCOL_ADDRESS,
            abi: parseAbi(ABI),
            functionName: 'balances',
            args: [account.address, WETH_ADDRESS]
        });
        console.log("Balances call success! Balance:", balance.toString());

        // 2. Simulate Deposit (requires valid token balance/approval logic, but we can verify the selector call)
        // We won't execute write, just simulate to see if the node recognizes the call.
        // Note: This might revert due to lack of tokens/approval, but SHOULD NOT be 'unrecognized selector'.
        try {
            await client.simulateContract({
                account,
                address: LENDING_PROTOCOL_ADDRESS,
                abi: parseAbi(ABI),
                functionName: 'deposit',
                args: [WETH_ADDRESS, 100n]
            });
            console.log("Deposit simulation success (or recognized)!");
        } catch (e) {
            // Check if error is logic error vs unrecognized selector
            console.log("Deposit simulation result:", e.shortMessage || e.message);
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

main();
