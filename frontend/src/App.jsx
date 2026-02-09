import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { parseEther, formatEther } from 'viem'
import { CONTRACTS } from './config'
import LendingProtocolABI from './abis/LendingProtocol.json'
import MockTokenABI from './abis/MockToken.json'

function App() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: hash, writeContract } = useWriteContract()

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

  // Read User Balance (Wallet)
  const { data: walletBalance, error: walletError, refetch: refetchWallet } = useReadContract({
    address: tokenAddress,
    abi: MockTokenABI,
    functionName: 'balanceOf',
    args: [address],
  })

  useEffect(() => {

    if (walletBalance) console.log(`Balance for ${tokenName}:`, formatEther(walletBalance));
    if (walletError) console.error(`Error fetching balance for ${tokenName}:`, walletError);
  }, [walletBalance, walletError]);

  // Read Protocol Balance
  const { data: protocolBalance, refetch: refetchProtocol } = useReadContract({
    address: CONTRACTS.LendingProtocol,
    abi: LendingProtocolABI,
    functionName: 'balances',
    args: [address, tokenAddress],
  })

  useEffect(() => {

    if (protocolBalance) console.log(`Protocol Balance for ${tokenName}:`, formatEther(protocolBalance));
  }, [protocolBalance]);



  // Refined approach: 2 buttons.

  return (
    <div className="card">
      <h2>{tokenName}</h2>
      <p>Wallet Balance: {walletBalance ? formatEther(walletBalance) : '0'}</p>
      <p>Protocol Balance: {protocolBalance ? formatEther(protocolBalance) : '0'}</p>

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
          refetch={() => { refetchWallet(); refetchProtocol(); }}
        />
      </div>
    </div>
  )
}

function ActionButtons({ tokenAddress, amount, refetch }) {
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

  const mint = () => {
    writeContract({
      address: tokenAddress,
      abi: MockTokenABI,
      functionName: 'mint',
      args: [address, parseEther("1000")],
    }, {
      onSuccess: (data) => {
        console.log("Mint transaction sent:", data);
        // Wait for confirmation is handled by the useEffect above for generic 'isSuccess' 
        // but we can also manually refetch after a delay or rely on the generic wait.
        // For immediate feedback, let's refetch.
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
      args: [CONTRACTS.LendingProtocol, parseEther(amount || "0")],
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
      args: [tokenAddress, parseEther(amount)],
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
      args: [tokenAddress, parseEther(amount)],
    }, {
      onSuccess: () => { refetch(); refetchAllowance(); }
    })
  }

  const parseAmount = (amt) => {
    try {
      return parseEther(amt || "0");
    } catch (e) {
      return 0n;
    }
  }

  const amountBN = parseAmount(amount);
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
