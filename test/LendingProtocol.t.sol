// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/MockToken.sol";
import "../contracts/LendingProtocol.sol";

contract LendingProtocolTest is Test {
    MockToken public token;
    LendingProtocol public lendingProtocol;
    address public user = address(1);

    function setUp() public {
        token = new MockToken("Test Token", "TEST");
        // For the deposit/withdraw tests, we just use the same token as both token0 and token1 
        // to satisfy the constructor, as we are testing lending logic here.
        lendingProtocol = new LendingProtocol(address(token), address(token));
        
        // Setup initial state
        vm.deal(user, 100 ether);
        token.mint(user, 1000 ether);
    }

    function testDeposit() public {
        vm.startPrank(user);
        
        token.approve(address(lendingProtocol), 100 ether);
        lendingProtocol.deposit(address(token), 100 ether);
        
        uint256 balance = lendingProtocol.balances(user, address(token));
        assertEq(balance, 100 ether);
        
        vm.stopPrank();
    }

    function testWithdraw() public {
        vm.startPrank(user);
        
        token.approve(address(lendingProtocol), 100 ether);
        lendingProtocol.deposit(address(token), 100 ether);
        
        lendingProtocol.withdraw(address(token), 50 ether);
        
        uint256 balance = lendingProtocol.balances(user, address(token));
        assertEq(balance, 50 ether);
        
        vm.stopPrank();
    }
}
