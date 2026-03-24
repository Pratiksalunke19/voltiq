import { useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ABIS } from '../contracts';
import { RPC_URL, BACKEND_PRIVATE_KEY } from '../constants';
import type { ProtocolData } from '../types';

interface UseTransactionsParams {
  walletAddress: string | null;
  provider: ethers.BrowserProvider | null;
  fetchUserData: (address: string, provider: ethers.BrowserProvider) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<ProtocolData>>;
  setIsUpdatingPrice: (v: boolean) => void;
  setLiquidationCountdown: (v: number | null) => void;
  setHasLiquidated: (v: boolean) => void;
  setSimEthPrice: (v: number) => void;
}

export function useTransactions({
  walletAddress,
  provider,
  fetchUserData,
  setData,
  setIsUpdatingPrice,
  setLiquidationCountdown,
  setHasLiquidated,
  setSimEthPrice,
}: UseTransactionsParams) {

  const handleDeposit = useCallback(async (depositAmount: string, depositAsset: string, onSuccess: () => void) => {
    if (!walletAddress || !provider || !depositAmount) return;
    try {
      const signer = await provider.getSigner();
      const assetAddr = CONTRACT_ADDRESSES[depositAsset as keyof typeof CONTRACT_ADDRESSES];
      const token = new ethers.Contract(assetAddr, ABIS['MockERC20'], signer);
      
      console.log(`Approving ${depositAsset}...`);
      let tx = await token.approve(CONTRACT_ADDRESSES['LendingPool'], ethers.MaxUint256);
      await tx.wait();

      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES['LendingPool'], ABIS['LendingPool'], signer);
      console.log(`Depositing ${depositAmount} ${depositAsset}...`);
      tx = await lendingPool.deposit(assetAddr, ethers.parseEther(depositAmount));
      await tx.wait();
      
      await fetchUserData(walletAddress, provider);
      onSuccess();
      alert("Deposit successful!");
    } catch(err) {
      console.error("Deposit failed!", err);
      alert("Deposit failed. Check console.");
    }
  }, [walletAddress, provider, fetchUserData]);

  const handleWithdraw = useCallback(async (withdrawAmount: string, withdrawAsset: string, onSuccess: () => void) => {
    if (!walletAddress || !provider || !withdrawAmount) return;
    try {
      const signer = await provider.getSigner();
      const assetAddr = CONTRACT_ADDRESSES[withdrawAsset as keyof typeof CONTRACT_ADDRESSES];
      
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES['LendingPool'], ABIS['LendingPool'], signer);
      console.log(`Withdrawing ${withdrawAmount} ${withdrawAsset}...`);
      let tx = await lendingPool.withdraw(assetAddr, ethers.parseEther(withdrawAmount));
      await tx.wait();
      
      await fetchUserData(walletAddress, provider);
      onSuccess();
      alert("Withdraw successful!");
    } catch(err) {
      console.error("Withdraw failed!", err);
      alert("Withdraw failed. Check console.");
    }
  }, [walletAddress, provider, fetchUserData]);

  const handleBorrow = useCallback(async (borrowAmount: string, borrowAsset: string, onSuccess: () => void) => {
    if (!walletAddress || !provider || !borrowAmount) return;
    try {
      const signer = await provider.getSigner();
      const assetAddr = CONTRACT_ADDRESSES[borrowAsset as keyof typeof CONTRACT_ADDRESSES];
      
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES['LendingPool'], ABIS['LendingPool'], signer);
      console.log(`Borrowing ${borrowAmount} ${borrowAsset}...`);
      let tx = await lendingPool.borrow(assetAddr, ethers.parseEther(borrowAmount));
      await tx.wait();
      
      await fetchUserData(walletAddress, provider);
      onSuccess();
      alert("Borrow successful!");
    } catch(err) {
      console.error("Borrow failed!", err);
      alert("Borrow failed. Check console.");
    }
  }, [walletAddress, provider, fetchUserData]);

  const handleRepay = useCallback(async (repayAmount: string, repayAsset: string, onSuccess: () => void) => {
    if (!walletAddress || !provider || !repayAmount) return;
    try {
      const signer = await provider.getSigner();
      const assetAddr = CONTRACT_ADDRESSES[repayAsset as keyof typeof CONTRACT_ADDRESSES];
      const token = new ethers.Contract(assetAddr, ABIS['MockERC20'], signer);
      
      console.log(`Approving ${repayAsset} for repay...`);
      let tx = await token.approve(CONTRACT_ADDRESSES['LendingPool'], ethers.MaxUint256);
      await tx.wait();

      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES['LendingPool'], ABIS['LendingPool'], signer);
      console.log(`Repaying ${repayAmount} ${repayAsset}...`);
      tx = await lendingPool.repay(assetAddr, ethers.parseEther(repayAmount));
      await tx.wait();
      
      await fetchUserData(walletAddress, provider);
      onSuccess();
      alert("Repay successful!");
    } catch(err) {
      console.error("Repay failed!", err);
      alert("Repay failed. Check console.");
    }
  }, [walletAddress, provider, fetchUserData]);

  const handleMint = useCallback(async (mintAmount: string, mintAsset: string) => {
    if (!walletAddress || !provider || !mintAmount) return;
    try {
      const signer = await provider.getSigner();
      const assetAddr = CONTRACT_ADDRESSES[mintAsset as keyof typeof CONTRACT_ADDRESSES];
      const token = new ethers.Contract(assetAddr, ABIS['MockERC20'], signer);
      
      console.log(`Minting ${mintAmount} ${mintAsset}...`);
      let tx = await token.mint(walletAddress, ethers.parseEther(mintAmount));
      await tx.wait();
      
      await fetchUserData(walletAddress, provider);
      alert(`Minted ${mintAmount} ${mintAsset} to your wallet!`);
    } catch(err) {
      console.error("Mint failed!", err);
    }
  }, [walletAddress, provider, fetchUserData]);

  const handlePriceChange = useCallback(async (newPrice: number) => {
    setSimEthPrice(newPrice);
    setHasLiquidated(false);
    
    if (!walletAddress || !provider) {
      alert("Please connect your wallet first!");
      return;
    }
    setIsUpdatingPrice(true);
    try {
      const jsonRpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const backendSigner = new ethers.Wallet(BACKEND_PRIVATE_KEY, jsonRpcProvider);
      
      const oracle = new ethers.Contract(CONTRACT_ADDRESSES['ORACLE'], ABIS['ChainlinkPriceOracle'], backendSigner);
      const assetAddr = CONTRACT_ADDRESSES['WETH'];
      const feedAddr = await oracle.sPriceFeeds(assetAddr);
      
      const feed = new ethers.Contract(feedAddr, ABIS['MockChainlinkAggregator'], backendSigner);
      
      const price8Decimals = Math.round(newPrice * 1e8);
      console.log(`Setting ETH price to ${newPrice} (${price8Decimals}) [AUTO-SIGNER]...`);
      
      let tx = await feed.setPrice(price8Decimals);
      await tx.wait();
      
      setData(prev => {
        const priceRatio = newPrice / prev.prices.WETH;
        const newCollateral = prev.collateralUsd * priceRatio;
        const newHf = prev.borrowUsd > 0 ? (newCollateral * prev.liquidationThreshold) / prev.borrowUsd : 999;
        
        return {
          ...prev,
          healthFactor: newHf,
          collateralUsd: newCollateral,
          prices: {
            ...prev.prices,
            WETH: newPrice
          }
        };
      });

      setLiquidationCountdown(10);
    } catch(err) {
      console.error("Price update failed", err);
      alert("Transaction failed.");
    } finally {
      setIsUpdatingPrice(false);
    }
  }, [walletAddress, provider, setData, setIsUpdatingPrice, setLiquidationCountdown, setHasLiquidated, setSimEthPrice]);

  return {
    handleDeposit,
    handleWithdraw,
    handleBorrow,
    handleRepay,
    handleMint,
    handlePriceChange,
  };
}
