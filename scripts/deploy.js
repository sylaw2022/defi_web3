import hre from "hardhat";
import { parseEther } from "viem";

async function main() {
    const publicClient = await hre.viem.getPublicClient();

    // Deploy Mock Tokens
    const weth = await hre.viem.deployContract("MockToken", ["Wrapped Ether", "WETH"]);
    console.log("Mock WETH deployed to:", weth.address);

    const usdc = await hre.viem.deployContract("MockToken", ["USD Coin", "USDC"]);
    console.log("Mock USDC deployed to:", usdc.address);

    // Deploy Lending Protocol
    const lendingProtocol = await hre.viem.deployContract("LendingProtocol", [[weth.address, usdc.address]]);
    console.log("LendingProtocol deployed to:", lendingProtocol.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
