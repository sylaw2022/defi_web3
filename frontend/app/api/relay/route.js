import { NextResponse } from 'next/server';
import { JsonRpcProvider, Wallet, parseEther } from 'ethers';

export async function POST(request) {
    try {
        const body = await request.json();
        const { userAddress } = body;

        if (!userAddress) {
            return NextResponse.json({ error: 'User address required' }, { status: 400 });
        }

        console.log(`Relayer receiving request for: ${userAddress}`);

        // 1. Connect to Hardhat Localhost
        const provider = new JsonRpcProvider("http://127.0.0.1:8545");

        // 2. Load the "Relayer" Wallet (Account #0 from Hardhat)
        // WARNING: NEVER use this key in production. This is Hardhat's default test key.
        const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
        const wallet = new Wallet(PRIVATE_KEY, provider);

        // 3. Send Transaction (1.0 ETH)
        const tx = await wallet.sendTransaction({
            to: userAddress,
            value: parseEther("1.0")
        });

        console.log(`Relayer sent 1.0 ETH to ${userAddress}. Hash: ${tx.hash}`);

        return NextResponse.json({
            success: true,
            txHash: tx.hash,
            message: "Funds sent successfully"
        });

    } catch (error) {
        console.error("Relayer Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
