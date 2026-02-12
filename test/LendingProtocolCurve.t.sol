// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/MockToken.sol";
import "../contracts/LendingProtocol.sol";
import "../contracts/mocks/MockCurvePool.sol";

contract LendingProtocolCurveTest is Test {
    MockToken public tokenA;
    MockToken public tokenB;
    LendingProtocol public lendingProtocol;
    MockCurvePool public curvePool;
    address public user = address(1);

    function setUp() public {
        tokenA = new MockToken("Token A", "TKA");
        tokenB = new MockToken("Token B", "TKB");
        
        curvePool = new MockCurvePool(address(tokenA), address(tokenB));
        
        // Mint tokens to Curve Pool to facilitate swaps
        tokenA.mint(address(curvePool), 10000 ether);
        tokenB.mint(address(curvePool), 10000 ether);

        address[] memory supportedTokens = new address[](2);
        supportedTokens[0] = address(tokenA);
        supportedTokens[1] = address(tokenB);
        lendingProtocol = new LendingProtocol(supportedTokens);
        lendingProtocol.setCurvePool(address(curvePool));
        
        // Setup initial user state
        vm.deal(user, 100 ether);
        tokenA.mint(user, 1000 ether);
        tokenB.mint(user, 1000 ether);
    }

    function testSwap() public {
        vm.startPrank(user);
        
        // Deposit Token A
        tokenA.approve(address(lendingProtocol), 100 ether);
        lendingProtocol.deposit(address(tokenA), 100 ether);
        
        // Check initial balance in protocol
        assertEq(lendingProtocol.balances(user, address(tokenA)), 100 ether);
        assertEq(lendingProtocol.balances(user, address(tokenB)), 0);

        // Swap 50 Token A for Token B
        // Assuming index 0 = tokenA, index 1 = tokenB in the mock
        lendingProtocol.swap(address(tokenA), address(tokenB), 0, 1, 50 ether, 49 ether);
        
        // Check final balances
        assertEq(lendingProtocol.balances(user, address(tokenA)), 50 ether);
        assertEq(lendingProtocol.balances(user, address(tokenB)), 50 ether); // Mock 1:1 swap
        
        vm.stopPrank();
    }
    
    function testSwapRevertInsufficientBalance() public {
        vm.startPrank(user);
        
        tokenA.approve(address(lendingProtocol), 100 ether);
        lendingProtocol.deposit(address(tokenA), 100 ether);
        
        vm.expectRevert("Insufficient balance");
        lendingProtocol.swap(address(tokenA), address(tokenB), 0, 1, 150 ether, 0);
        
        vm.stopPrank();
    }
}
