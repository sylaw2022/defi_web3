// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract LendingProtocol {
    using SafeERC20 for IERC20;

    // --- State Variables ---
    mapping(address => mapping(address => uint256)) public balances; // User -> Token -> Amount (Lending Balances)
    mapping(address => bool) public supportedTokens;

    // AMM State
    address public token0;
    address public token1;
    
    uint256 public reserve0;
    uint256 public reserve1;
    
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf; // User -> LP Token Balance

    // --- Events ---
    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    
    event AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity);
    event RemoveLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Swap(address indexed user, address indexed inputToken, uint256 amountIn, uint256 amountOut);

    constructor(address _token0, address _token1) {
        token0 = _token0;
        token1 = _token1;
        supportedTokens[_token0] = true;
        supportedTokens[_token1] = true;
    }

    // --- Lending Functionality ---

    function deposit(address token, uint256 amount) external {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender][token] += amount;

        emit Deposit(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external {
        require(balances[msg.sender][token] >= amount, "Insufficient balance");
        
        balances[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, token, amount);
    }

    // --- AMM Functionality ---
    
    // Low-level helper to mint LP tokens
    function _mint(address to, uint256 value) internal {
        totalSupply += value;
        balanceOf[to] += value;
    }

    // Low-level helper to burn LP tokens
    function _burn(address from, uint256 value) internal {
        balanceOf[from] -= value;
        totalSupply -= value;
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external returns (uint256 liquidity) {
        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_INPUT_AMOUNT");
        
        // Pull tokens from user
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);

        // Simple check: In production, you'd check optimal ratio here or return excess.
        // For this task, we assume user calculates correctly or accepts the ratio.

        if (totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1);
        } else {
            liquidity = Math.min(
                (amount0 * totalSupply) / reserve0,
                (amount1 * totalSupply) / reserve1
            );
        }

        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");

        _mint(msg.sender, liquidity);
        
        // Update reserves
        reserve0 += amount0;
        reserve1 += amount1;

        emit AddLiquidity(msg.sender, amount0, amount1, liquidity);
    }

    function removeLiquidity(uint256 liquidity) external returns (uint256 amount0, uint256 amount1) {
        require(balanceOf[msg.sender] >= liquidity, "Insufficient LP balance");

        // Calculate proportional usage using the formula:
        // amount = (liquidity * reserve) / totalSupply
        amount0 = (liquidity * reserve0) / totalSupply;
        amount1 = (liquidity * reserve1) / totalSupply;

        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_LIQUIDITY_BURNED");

        _burn(msg.sender, liquidity);

        // Update reserves
        reserve0 -= amount0;
        reserve1 -= amount1;

        // Transfer tokens back
        IERC20(token0).safeTransfer(msg.sender, amount0);
        IERC20(token1).safeTransfer(msg.sender, amount1);

        emit RemoveLiquidity(msg.sender, amount0, amount1, liquidity);
    }

    function swap(address inputToken, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut) {
        require(inputToken == token0 || inputToken == token1, "INVALID_TOKEN");
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");

        // Transfer input token from user
        IERC20(inputToken).safeTransferFrom(msg.sender, address(this), amountIn);

        bool isToken0 = inputToken == token0;
        (uint256 reserveIn, uint256 reserveOut) = isToken0 ? (reserve0, reserve1) : (reserve1, reserve0);

        // Calculate Amount Out with 0.3% Fee
        // amountInWithFee = amountIn * 997
        // numerator = amountInWithFee * reserveOut
        // denominator = (reserveIn * 1000) + amountInWithFee
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        
        amountOut = numerator / denominator;

        require(amountOut >= minAmountOut, "INSUFFICIENT_OUTPUT_AMOUNT");

        // Update Reserves
        if (isToken0) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }

        // Transfer output token to user
        address outputToken = isToken0 ? token1 : token0;
        IERC20(outputToken).safeTransfer(msg.sender, amountOut);

        emit Swap(msg.sender, inputToken, amountIn, amountOut);
    }
}
