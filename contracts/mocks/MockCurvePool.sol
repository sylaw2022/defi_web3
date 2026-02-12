// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockCurvePool {
    using SafeERC20 for IERC20;

    address public token0;
    address public token1;

    constructor(address _token0, address _token1) {
        token0 = _token0;
        token1 = _token1;
    }

    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256) {
        address inputToken = i == 0 ? token0 : token1;
        address outputToken = j == 0 ? token0 : token1;

        // Transfer input token from user to pool
        IERC20(inputToken).safeTransferFrom(msg.sender, address(this), dx);

        // Simple 1:1 exchange for mock purposes + fee simulation of 1 wei if needed, but keeping simple
        uint256 dy = dx; // 1:1 verify

        require(dy >= min_dy, "Slippage too high");

        // Transfer output token to user
        // Ensure the pool has enough balance (should be minted in test setup)
        IERC20(outputToken).safeTransfer(msg.sender, dy);

        return dy;
    }
}
