import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

describe("LendingProtocol", function () {
    let lendingProtocol, weth, usdc;
    let publicClient, walletClient;
    let owner, user1;

    beforeEach(async function () {
        publicClient = await hre.viem.getPublicClient();
        [owner, user1] = await hre.viem.getWalletClients();

        weth = await hre.viem.deployContract("MockToken", ["Wrapped Ether", "WETH"]);
        usdc = await hre.viem.deployContract("MockToken", ["USD Coin", "USDC"]);

        lendingProtocol = await hre.viem.deployContract("LendingProtocol", [[weth.address, usdc.address]]);

        // Mint tokens to user1
        const amount = parseEther("1000");
        await weth.write.mint([user1.account.address, amount]);
        await usdc.write.mint([user1.account.address, amount]);

        // Approve protocol
        await weth.write.approve([lendingProtocol.address, amount], { account: user1.account });
        await usdc.write.approve([lendingProtocol.address, amount], { account: user1.account });
    });

    it("Should allow depositing WETH", async function () {
        const depositAmount = parseEther("10");

        // Deposit
        await lendingProtocol.write.deposit([weth.address, depositAmount], { account: user1.account });

        // Check balance
        const balance = await lendingProtocol.read.balances([user1.account.address, weth.address]);
        expect(balance).to.equal(depositAmount);
    });

    it("Should allow withdrawing WETH", async function () {
        const depositAmount = parseEther("10");
        await lendingProtocol.write.deposit([weth.address, depositAmount], { account: user1.account });

        const withdrawAmount = parseEther("5");
        await lendingProtocol.write.withdraw([weth.address, withdrawAmount], { account: user1.account });

        const balance = await lendingProtocol.read.balances([user1.account.address, weth.address]);
        expect(balance).to.equal(depositAmount - withdrawAmount);
    });
});
