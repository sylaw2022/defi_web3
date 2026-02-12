import { expect } from "chai";
import hre from "hardhat";
import { parseEther, formatEther } from "viem";

describe("LendingProtocol AMM", function () {
    let lendingProtocol;
    let tokenA;
    let tokenB;
    let owner;
    let user1;
    let user2;
    let publicClient;

    beforeEach(async function () {
        const [ownerClient, user1Client, user2Client] = await hre.viem.getWalletClients();
        owner = ownerClient;
        user1 = user1Client;
        user2 = user2Client;
        publicClient = await hre.viem.getPublicClient();

        // Deploy Mock Tokens
        tokenA = await hre.viem.deployContract("MockToken", ["Token A", "TKNA"]);
        tokenB = await hre.viem.deployContract("MockToken", ["Token B", "TKNB"]);

        // Deploy Lending Protocol
        lendingProtocol = await hre.viem.deployContract("LendingProtocol", [tokenA.address, tokenB.address]);

        // Mint tokens to users
        await tokenA.write.mint([user1.account.address, parseEther("1000")]);
        await tokenB.write.mint([user1.account.address, parseEther("1000")]);
        await tokenA.write.mint([user2.account.address, parseEther("1000")]);
        await tokenB.write.mint([user2.account.address, parseEther("1000")]); // Give user2 some B too, just in case

        // Approve protocol
        await tokenA.write.approve([lendingProtocol.address, parseEther("1000000")], { account: user1.account });
        await tokenB.write.approve([lendingProtocol.address, parseEther("1000000")], { account: user1.account });
        await tokenA.write.approve([lendingProtocol.address, parseEther("1000000")], { account: user2.account });
        await tokenB.write.approve([lendingProtocol.address, parseEther("1000000")], { account: user2.account });
    });

    it("Should allow adding liquidity", async function () {
        await lendingProtocol.write.addLiquidity(
            [parseEther("100"), parseEther("100")],
            { account: user1.account }
        );

        const reserve0 = await lendingProtocol.read.reserve0();
        const reserve1 = await lendingProtocol.read.reserve1();
        const lpBalance = await lendingProtocol.read.balanceOf([user1.account.address]);

        expect(reserve0).to.equal(parseEther("100"));
        expect(reserve1).to.equal(parseEther("100"));
        expect(lpBalance > 0n).to.be.true;
    });

    it("Should allow swapping with fee", async function () {
        // User 1 provides liquidity (1000 A : 1000 B)
        await lendingProtocol.write.addLiquidity(
            [parseEther("1000"), parseEther("1000")],
            { account: user1.account }
        );

        // User 2 swaps 100 Token A for Token B
        await lendingProtocol.write.swap(
            [tokenA.address, parseEther("100"), 0n],
            { account: user2.account }
        );

        const balB = await tokenB.read.balanceOf([user2.account.address]);

        // Expected Output:
        // User starts with 1000 B.
        // Swaps 100 A -> gets ~90.66 B.
        // Final Balance should be ~1090.66 B.

        // 1090.66...
        // We check if it's roughly correct (greater than 1090)
        expect(balB > parseEther("1090")).to.be.true;
        expect(balB < parseEther("1091")).to.be.true;
    });

    it("Should allow removing liquidity", async function () {
        // Add Liquidity
        await lendingProtocol.write.addLiquidity(
            [parseEther("100"), parseEther("100")],
            { account: user1.account }
        );

        const lpBalance = await lendingProtocol.read.balanceOf([user1.account.address]);

        // Remove all liquidity
        await lendingProtocol.write.removeLiquidity(
            [lpBalance],
            { account: user1.account }
        );

        const reserve0 = await lendingProtocol.read.reserve0();
        expect(reserve0).to.equal(0n);

        // User should have back approx original amount
        const finalBal = await tokenA.read.balanceOf([user1.account.address]);
        expect(finalBal).to.equal(parseEther("1000"));
    });
});
