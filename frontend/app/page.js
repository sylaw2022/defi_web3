'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS } from '../src/config'
import LendingProtocolABI from '../src/abis/LendingProtocol.json'
import MockTokenABI from '../src/abis/MockToken.json'

export default function Home() {
    const { address, isConnected } = useAccount()
    const { connect } = useConnect()
    const { disconnect } = useDisconnect()

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <h1 className="text-2xl font-bold mb-6 text-gray-800">DeFi Lending Protocol</h1>
                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
                        onClick={() => connect({ connector: injected() })}
                    >
                        Connect Wallet
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">DeFi Lending Protocol</h1>
                        <p className="text-gray-600 mt-1 text-sm">Connected: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{address}</span></p>
                    </div>
                    <button
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm transition duration-150"
                        onClick={() => disconnect()}
                    >
                        Disconnect
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <TokenSection tokenName="WETH" tokenAddress={CONTRACTS.WETH} />
                    <TokenSection tokenName="USDC" tokenAddress={CONTRACTS.USDC} />
                </div>
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

    // Read Protocol Balance
    const { data: protocolBalance, refetch: refetchProtocol } = useReadContract({
        address: CONTRACTS.LendingProtocol,
        abi: LendingProtocolABI,
        functionName: 'balances',
        args: [address, tokenAddress],
    })

    const tokenDecimals = decimals || 18; // Default to 18 while loading

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">{tokenName}</h2>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-xs text-blue-600 uppercase font-semibold mb-1">Wallet Balance</p>
                        <p className="text-lg font-mono font-medium text-blue-900 truncate">
                            {walletBalance !== undefined ? formatUnits(walletBalance, tokenDecimals) : '0'}
                        </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-xs text-green-600 uppercase font-semibold mb-1">Protocol Balance</p>
                        <p className="text-lg font-mono font-medium text-green-900 truncate">
                            {protocolBalance !== undefined ? formatUnits(protocolBalance, tokenDecimals) : '0'}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="relative rounded-md shadow-sm">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="block w-full rounded-md border-gray-300 pl-4 pr-12 py-3 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 text-gray-900"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">{tokenName}</span>
                        </div>
                    </div>

                    <ActionButtons
                        tokenAddress={tokenAddress}
                        amount={amount}
                        decimals={tokenDecimals}
                        refetch={() => { refetchWallet(); refetchProtocol(); }}
                    />
                </div>
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

    return (
        <div className="grid grid-cols-2 gap-3">
            <button
                className="col-span-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition duration-150 w-full"
                disabled={isPending}
                onClick={mint}
            >
                Mint 1000
            </button>

            {!amount || amountBN === 0n ? (
                <button className="bg-gray-100 text-gray-400 font-bold py-2 px-4 rounded cursor-not-allowed" disabled>
                    Enter Amount
                </button>
            ) : !isApproved ? (
                <button
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition duration-150"
                    disabled={isPending}
                    onClick={approve}
                >
                    Approve Use
                </button>
            ) : (
                <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150"
                    disabled={isPending}
                    onClick={deposit}
                >
                    Deposit
                </button>
            )}

            <button
                className={`${!amount || amountBN === 0n ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'} font-bold py-2 px-4 rounded transition duration-150`}
                disabled={isPending || !amount || amountBN === 0n}
                onClick={withdraw}
            >
                Withdraw
            </button>

            <div className="col-span-2 mt-4 pt-4 border-t border-gray-100">
                <RelayerButton userAddress={address} />
            </div>

            {isConfirming && (
                <div className="col-span-2 text-center text-sm text-blue-600 animate-pulse mt-2">
                    Confirming transaction...
                </div>
            )}
        </div>
    )
}

function RelayerButton({ userAddress }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    const requestFunds = async () => {
        setLoading(true);
        setStatus(null);
        try {
            const response = await fetch('/api/relay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userAddress }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus({ type: 'success', msg: `Received 1 ETH! Hash: ${data.txHash.slice(0, 10)}...` });
            } else {
                setStatus({ type: 'error', msg: data.error || 'Failed to request funds' });
            }
        } catch (err) {
            setStatus({ type: 'error', msg: 'Network error calling relayer' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="text-center">
            <button
                onClick={requestFunds}
                disabled={loading}
                className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 py-1 px-3 rounded-full font-semibold transition"
            >
                {loading ? 'Requesting...' : '💰 Request Relayer Faucet (1 ETH)'}
            </button>
            {status && (
                <p className={`text-xs mt-2 ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {status.msg}
                </p>
            )}
        </div>
    )
}
