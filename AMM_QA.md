# AMM Deep Dive Q&A

Comprehensive questions and answers about Automated Market Makers (AMMs), covering Uniswap V2, V3, V4, and other protocols.

---

## Table of Contents
- [Core Concepts](#core-concepts)
- [Uniswap V2 vs V3](#uniswap-v2-vs-v3)
- [Capital Efficiency](#capital-efficiency)
- [Uniswap V4 Hooks](#uniswap-v4-hooks)
- [Other AMM Protocols](#other-amm-protocols)
- [Security & MEV](#security--mev)

---

## Core Concepts

### What does `using SafeERC20 for IERC20` mean?

It attaches the `SafeERC20` library functions to any variable of type `IERC20`, allowing you to call them as methods.

**Why needed?**
- Some tokens (like USDT) don't return a boolean from `transfer()`
- Some tokens return `false` instead of reverting on failure
- `SafeERC20` normalizes these behaviors and ensures safe transfers

**Example:**
```solidity
using SafeERC20 for IERC20;

// Without: SafeERC20.safeTransfer(IERC20(token), to, amount);
// With: IERC20(token).safeTransfer(to, amount);
```

### Will a function with `view` or `pure` modifier create a transaction?

**No.** Client libraries (Ethers.js, Viem) detect these modifiers in the ABI and use:
- `eth_call` for `view`/`pure` (free, local execution)
- `eth_sendTransaction` for state-changing functions (costs gas, on-chain)

### What happens if I send ETH to a `nonpayable` function?

**Transaction reverts immediately.**
- Your ETH stays in your wallet
- You only pay a small gas fee for the failed transaction
- Solidity protects you from accidentally donating ETH

`payable` functions accept ETH. `nonpayable` functions reject it.

---

## Uniswap V2 vs V3

### What's the main problem with Uniswap V2?

**Capital inefficiency.** Your liquidity is spread across the entire price curve (0 to ∞), but most sits idle.

**Example:**
```
You deposit: 10 ETH at price $2000
Only ~1-2% actively earns fees near current price
The other 98% sits at prices like $1/ETH or $100,000/ETH (unused)
```

### If everyone sets the same tight range in V3, isn't it the same as V2?

**No, it's still better** because:

1. **Zero wasted capital** - All liquidity is active, not spread to impossible prices
2. **Volume multiplier** - Better execution attracts 10x more traders → 10x more fees
3. **Market distributes naturally** - Bulls/bears/conservatives spread across ranges
4. **Strategic opportunities** - Active management creates alpha

Even with competition, V3's total fee pool is much larger than V2's.

### How can 10 ETH provide "200 ETH virtual depth"?

**Virtual reserves** are a mathematical representation of how your liquidity behaves within your chosen range.

**Example:**
```
V2: 10 ETH spread across $0-∞
    Effective depth at $2000: ~0.5 ETH

V3: 10 ETH concentrated in $1900-$2100  
    Effective depth at $2000: ~200 ETH (20x multiplier)
```

The 200 ETH is "virtual" - you physically have 10 ETH, but it provides the same price impact resistance as 200 ETH would in V2.

### So V3 is about betting on the right range?

**Exactly.**

- **V2**: Passive, always earning *something* (but small)
- **V3**: Active, bet right = high returns, bet wrong = $0

**Trade-off:**
```
Conservative (wide range):   Always in range, low fees
Aggressive (tight range):    High fees when active, risk of going out
Speculative (future range):  Extreme fees IF price goes there
```

### What happens to my capital if price leaves my range?

Your capital is safe but:
- **Stops earning fees** (out of range)
- **Converts to one token** (100% ETH or 100% USDC)
- **Can withdraw anytime** and redeploy

It's like a limit order that didn't fill - you keep your assets but earned nothing.

---

## Capital Efficiency

### Why does your liquidity "sit idle" in V2?

The constant product curve `xy = k` extends infinitely, but trades only happen near the current price.

**Analogy:**
```
Your 10 soldiers must guard a 1000km border (V2)
Density: 0.01 soldiers/km → Weak everywhere

Your 10 soldiers guard only 20km (V3)
Density: 0.5 soldiers/km → 50x stronger defense
```

Only the liquidity near the current price earns meaningful fees.

### If I deposit 10 ETH in V2, do I only earn on 2 ETH?

**No.** You earn on all 10 ETH proportional to your pool share.

**The real issue is rate:**
- Your 10 ETH is diluted across infinite prices
- Your "effective depth" at current price is small
- You earn a smaller share of fees

V3 concentrates your 10 ETH where trades happen → higher share of fees.

### Why does V3 attract more trading volume?

**Better execution:**
```
Trader swaps $100k USDC for ETH

V2: 3% slippage → Trader pays $3000 extra
V3: 0.3% slippage → Trader pays $300 extra

Trader chooses V3 → More volume → More fees for you
```

Same capital, 10x more volume = 10x more earnings (even with same share %).

---

## Uniswap V4 Hooks

### What are V4 hooks?

**Programmable callbacks** that execute at key points in the swap lifecycle:
- `beforeSwap()` - Run custom logic before swap
- `afterSwap()` - Run custom logic after swap
- Same for `addLiquidity`, `removeLiquidity`, etc.

### Are hooks called inside the swap function?

**Yes.** The core `PoolManager.swap()` function explicitly calls your hook:

```solidity
function swap(...) external {
    if (pool.hasBeforeSwapHook()) {
        hooks.beforeSwap(...);  // Your custom logic
    }
    
    // Core swap (xy=k math)
    
    if (pool.hasAfterSwapHook()) {
        hooks.afterSwap(...);   // Your custom logic
    }
}
```

If your hook reverts, the entire transaction fails.

### What can hooks do?

**Examples:**
1. **Dynamic fees** - Charge higher fees during volatility
2. **MEV protection** - Reject sandwich attacks
3. **Limit orders** - Trigger orders at specific prices
4. **TWAP oracles** - Record price data every swap
5. **Auto-rebalancing** - Automatically adjust LP positions
6. **Loyalty rewards** - Discount fees for frequent traders

### Is hook MEV protection the same as slippage tolerance?

**No.**
- **Slippage tolerance** (user-side): "I won't accept worse than X%" - Reactive
- **Hook MEV protection** (pool-side): "This pool rejects attack patterns" - Proactive

Hooks can **prevent** attacks; slippage only **limits damage** after it happens.

Best protection = Both + private mempool (Flashbots).

### Does only Uniswap have hooks?

**No.** Uniswap V4 pioneered comprehensive hooks (2024), but others followed:
- Balancer V3 - "Pool hooks"
- PancakeSwap V3 - Forked V4 hooks
- Trader Joe V2.1 - Similar callback system

By 2026, hooks are becoming industry standard.

---

## Other AMM Protocols

### What's the advantage of Curve's Stableswap?

**100-1000x lower slippage** for assets that trade at 1:1 (stablecoins, wstETH/ETH).

**Why:**
```
V2 uses xy = k (hyperbolic curve)
- Assumes tokens can have any price
- High slippage even for stable pairs

Curve uses hybrid constant sum + product
- Flat curve near 1:1
- Only curves at extremes (depeg protection)
```

**Example:**
```
Swap $100k USDC → USDT

V2:      9% slippage ($9,091 loss)
Curve: 0.01% slippage ($10 loss)
```

### Is constant product still dominant today?

**No.** Market share (2024-2026):
1. **Uniswap V3** (concentrated liquidity) - 40% volume
2. **Curve** (stableswap) - 20%
3. **Uniswap V2** (constant product) - 15%
4. **Others** - 25%

Pure constant product is declining but still used for long-tail assets and passive LPs.

---

## Security & MEV

### Can someone "crash" the pool by depositing huge amounts?

**No, depends on what they do:**

**Adding liquidity** (`addLiquidity`):
- Pool gets bigger ✅
- Price stays same ✅
- No crash

**Dumping tokens** (`swap`):
- Price crashes ✅
- Pool still functions (can't break)
- LPs suffer impermanent loss
- Arbitrageurs restore price

The constant product formula `xy = k` mathematically prevents the pool from being drained.

### How can hackers exploit V2?

**Main attack vectors:**

1. **Sandwich attacks** - Front-run + back-run your trade
2. **Flash loan manipulation** - Borrow millions, crash price, exploit other protocols
3. **Oracle manipulation** - Manipulate spot price in one transaction
4. **JIT liquidity** - Bots add liquidity just before your swap, steal fees
5. **Low liquidity exploitation** - Create fake pools to fool protocols

**Protections:**
- Use `minAmountOut` (slippage protection)
- Use private relays (Flashbots)
- Protocols should use TWAP, not spot price

---

## Key Takeaways

1. **V2 vs V3**: V2 is passive/safe but inefficient. V3 is active/risky but 10-100x better returns.

2. **Capital efficiency**: V3 concentrates capital where trades happen; V2 wastes it on impossible prices.

3. **Hooks**: V4's programmability transforms AMMs from fixed protocols to platforms.

4. **Stableswap**: Purpose-built for pegged assets; Curve dominates stablecoin swaps.

5. **Security**: Constant product pools can't "break," but MEV/manipulation are real risks.
