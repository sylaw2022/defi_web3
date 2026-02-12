import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS } from './config'
import LendingProtocolABI from './abis/LendingProtocol.json'
import MockTokenABI from './abis/MockToken.json'

function App() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  if (!isConnected) {
    return (
      <div className="container">
        <h1>DeFi Lending Protocol</h1>
        <button onClick={() => connect({ connector: injected() })}>Connect Wallet</button>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>DeFi Lending Protocol</h1>
      <p>Connected: {address}</p>
      <button onClick={() => disconnect()}>Disconnect</button>

      <div className="dashboard">
        <TokenSection tokenName="WETH" tokenAddress={CONTRACTS.WETH} />
        <TokenSection tokenName="USDC" tokenAddress={CONTRACTS.USDC} />
      </div>
    </div>
  )
}

function TokenSection({ tokenName, tokenAddress }) {
  const { address } = useAccount()
  const [amount, setAmount] = useState('')
  const { writeContract } = useWriteContract()

  // Read Token Decimals
  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: MockTokenABI,
    functionName: 'decimals',
  })

  // Read User Balance (Wallet)
  const { data: walletBalance, error: walletError, refetch: refetchWallet } = useReadContract({
    address: tokenAddress,
    abi: MockTokenABI,
    functionName: 'balanceOf',
    args: [address],
  })

  useEffect(() => {
    if (walletBalance !== undefined && decimals) console.log(`Balance for ${tokenName}:`, formatUnits(walletBalance, decimals));
    if (walletError) console.error(`Error fetching balance for ${tokenName}:`, walletError);
  }, [walletBalance, walletError, decimals, tokenName]);

  // Read Protocol Balance
  const { data: protocolBalance, refetch: refetchProtocol } = useReadContract({
    address: CONTRACTS.LendingProtocol,
    abi: LendingProtocolABI,
    functionName: 'balances',
    args: [address, tokenAddress],
  })

  useEffect(() => {
    if (protocolBalance !== undefined && decimals) console.log(`Protocol Balance for ${tokenName}:`, formatUnits(protocolBalance, decimals));
  }, [protocolBalance, decimals, tokenName]);

  const tokenDecimals = decimals || 18; // Default to 18 while loading

  return (
    <div className="card">
      <h2>{tokenName}</h2>
      <p>Wallet Balance: {walletBalance !== undefined ? formatUnits(walletBalance, tokenDecimals) : '0'}</p>
      <p>Protocol Balance: {protocolBalance !== undefined ? formatUnits(protocolBalance, tokenDecimals) : '0'}</p>

      <div className="actions">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
        />
        <ActionButtons
          tokenAddress={tokenAddress}
          amount={amount}
          decimals={tokenDecimals}
          refetch={() => { refetchWallet(); refetchProtocol(); }}
        />
      </div>
    </div>
  )
}

function ActionButtons({ tokenAddress, amount, decimals, refetch }) {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isSuccess) {
      console.log("Transaction confirmed successfully!", hash);
    }
  }, [isSuccess, hash]);

  // Read Allowance
  const { data: allowance, error: allowanceError, refetch: refetchAllowance, isLoading: isAllowanceLoading } = useReadContract({
    address: tokenAddress,
    abi: MockTokenABI,
    functionName: 'allowance',
    args: [address, CONTRACTS.LendingProtocol],
  })

  useEffect(() => {
    if (isAllowanceLoading) {
      console.log(`Fetching allowance for ${tokenAddress}...`);
    } else if (allowance !== undefined) {
      console.log(`Allowance for ${tokenAddress} UPDATED:`, allowance, typeof allowance);
    }
    if (allowanceError) {
      console.error(`Error fetching allowance for ${tokenAddress}:`, allowanceError);
    }
  }, [allowance, allowanceError, isAllowanceLoading, tokenAddress]);

  const parseAmount = (amt) => {
    try {
      return parseUnits(amt || "0", decimals);
    } catch (e) {
      return 0n;
    }
  }

  const amountBN = parseAmount(amount);

  const mint = () => {
    writeContract({
      address: tokenAddress,
      abi: MockTokenABI,
      functionName: 'mint',
      args: [address, parseUnits("1000", decimals)],
    }, {
      onSuccess: (data) => {
        console.log("Mint transaction sent:", data);
        refetch();
      },
      onError: (error) => {
        console.error("Mint failed:", error);
      }
    })
  }

  const approve = () => {
    writeContract({
      address: tokenAddress,
      abi: MockTokenABI,
      functionName: 'approve',
      args: [CONTRACTS.LendingProtocol, amountBN],
    }, {
      onSuccess: () => { refetchAllowance(); }
    })
  }

  const deposit = () => {
    console.log(`Depositing ${amount} of ${tokenAddress}...`);
    writeContract({
      address: CONTRACTS.LendingProtocol,
      abi: LendingProtocolABI,
      functionName: 'deposit',
      args: [tokenAddress, amountBN],
    }, {
      onSuccess: (data) => {
        console.log("Deposit transaction sent:", data);
        refetch();
        refetchAllowance();
      },
      onError: (error) => {
        console.error("Deposit failed:", error);
      }
    })
  }

  const withdraw = () => {
    writeContract({
      address: CONTRACTS.LendingProtocol,
      abi: LendingProtocolABI,
      functionName: 'withdraw',
      args: [tokenAddress, amountBN],
    }, {
      onSuccess: () => { refetch(); refetchAllowance(); }
    })
  }

  const allowanceBN = allowance || 0n;
  const isApproved = amount && amountBN > 0n && allowanceBN >= amountBN;

  console.log(`isApproved: ${isApproved} (Allowance: ${allowanceBN}, Required: ${amountBN})`);

  return (
    <div className="button-group">
      <button disabled={isPending} onClick={mint}>Mint 1000</button>

      {!amount || amountBN === 0n ? (
        <button disabled>Enter Amount</button>
      ) : !isApproved ? (
        <button disabled={isPending} onClick={approve}>Approve Use</button>
      ) : (
        <button disabled={isPending} onClick={deposit}>Deposit</button>
      )}

      <button disabled={isPending || !amount || amountBN === 0n} onClick={withdraw}>Withdraw</button>
      {isConfirming && <div>Confirming...</div>}
    </div>
  )
}

export default App
