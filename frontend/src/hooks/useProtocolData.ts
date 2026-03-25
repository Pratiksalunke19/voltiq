import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ABIS } from '../contracts';
import type { ProtocolData } from '../types';
import { MOCK_DATA, RPC_URL } from '../constants';

export function useProtocolData() {
  const [data, setData] = useState<ProtocolData>(MOCK_DATA);
  const [simEthPrice, setSimEthPrice] = useState(2500);
  const [walletBalances, setWalletBalances] = useState<Record<string, string>>({
    WETH: '--',
    WBTC: '--',
    USDC: '--'
  });

  // Fetch real on-chain price on initial load
  useEffect(() => {
    let active = true;
    const fetchOraclePrice = async () => {
      try {
        const jsonRpcProvider = new ethers.JsonRpcProvider(RPC_URL);
        const oracle = new ethers.Contract(CONTRACT_ADDRESSES['ORACLE'], ABIS['ChainlinkPriceOracle'], jsonRpcProvider);
        
        const wethPriceBN = await oracle.getPrice(CONTRACT_ADDRESSES['WETH']);
        const wethPriceNum = Number(ethers.formatUnits(wethPriceBN, 18));
        
        const wbtcPriceBN = await oracle.getPrice(CONTRACT_ADDRESSES['WBTC']);
        const wbtcPriceNum = Number(ethers.formatUnits(wbtcPriceBN, 18));
        
        if (active) {
          if (wethPriceNum > 0) setSimEthPrice(wethPriceNum);
          
          setData(prev => ({
            ...prev,
            prices: {
              ...prev.prices,
              WETH: wethPriceNum > 0 ? wethPriceNum : prev.prices.WETH,
              WBTC: wbtcPriceNum > 0 ? wbtcPriceNum : prev.prices.WBTC,
              USDC: 1.00
            }
          }));
        }
      } catch (err) {
        console.error("Failed to fetch initial oracle prices", err);
      }
    };
    fetchOraclePrice();
    return () => { active = false; };
  }, []);

  const fetchUserData = useCallback(async (address: string, provider: ethers.BrowserProvider) => {
    try {
      const positionManager = new ethers.Contract(
        CONTRACT_ADDRESSES['PositionManager'],
        ABIS['PositionManager'],
        provider
      );
      
      const pos = await positionManager.getPosition(address);
      
      const collateral = Number(ethers.formatUnits(pos.collateralValue.toString(), 18));
      const borrow = Number(ethers.formatUnits(pos.borrowValue.toString(), 18));
      
      let hf = 999;
      if (borrow > 0 && pos.healthFactor) {
        hf = Number(ethers.formatUnits(pos.healthFactor.toString(), 18));
      }

      const wethCollateralBN = await positionManager.sUserCollateral(address, CONTRACT_ADDRESSES['WETH']);
      const wbtcCollateralBN = await positionManager.sUserCollateral(address, CONTRACT_ADDRESSES['WBTC']);
      
      const wethFormatted = ethers.formatUnits(wethCollateralBN, 18);
      const wbtcFormatted = ethers.formatUnits(wbtcCollateralBN, 18);
      const wethAmount = Number(wethFormatted);
      const wbtcAmount = Number(wbtcFormatted);

      const wethToken = new ethers.Contract(CONTRACT_ADDRESSES['WETH'], ABIS['MockERC20'], provider);
      const wbtcToken = new ethers.Contract(CONTRACT_ADDRESSES['WBTC'], ABIS['MockERC20'], provider);
      const usdcToken = new ethers.Contract(CONTRACT_ADDRESSES['USDC'], ABIS['MockERC20'], provider);
      
      const [wethWallet, wbtcWallet, usdcWallet] = await Promise.all([
        wethToken.balanceOf(address),
        wbtcToken.balanceOf(address),
        usdcToken.balanceOf(address)
      ]);

      const wethWalletUnits = ethers.formatUnits(wethWallet, 18);
      const wbtcWalletUnits = ethers.formatUnits(wbtcWallet, 18);
      const usdcWalletUnits = ethers.formatUnits(usdcWallet, 18);

      setWalletBalances({
        WETH: parseFloat(wethWalletUnits).toFixed(4),
        WBTC: parseFloat(wbtcWalletUnits).toFixed(4),
        USDC: parseFloat(usdcWalletUnits).toFixed(4),
        WETH_FULL: wethWalletUnits,
        WBTC_FULL: wbtcWalletUnits,
        USDC_FULL: usdcWalletUnits
      });

      const oracle = new ethers.Contract(CONTRACT_ADDRESSES['ORACLE'], ABIS['ChainlinkPriceOracle'], provider);
      const wethPriceBN = await oracle.getPrice(CONTRACT_ADDRESSES['WETH']);
      const wbtcPriceBN = await oracle.getPrice(CONTRACT_ADDRESSES['WBTC']);
      const wethPrice = Number(ethers.formatUnits(wethPriceBN, 18));
      const wbtcPrice = Number(ethers.formatUnits(wbtcPriceBN, 18));
      
      const wethValueUsd = wethAmount * wethPrice;
      const wbtcValueUsd = wbtcAmount * wbtcPrice;
      const totalValue = wethValueUsd + wbtcValueUsd;

      let wethPercentage = 0;
      let wbtcPercentage = 0;
      
      if (totalValue > 0) {
        wethPercentage = Math.round((wethValueUsd / totalValue) * 100);
        wbtcPercentage = 100 - wethPercentage;
      }

      const collateralDistribution = [
        { asset: 'WETH', amount: wethAmount, fullAmount: wethFormatted, percentage: wethPercentage, color: '#3b82f6' },
        { asset: 'WBTC', amount: wbtcAmount, fullAmount: wbtcFormatted, percentage: wbtcPercentage, color: '#f59e0b' },
      ];

      setData(prev => ({
        ...prev,
        healthFactor: hf,
        collateralUsd: collateral,
        borrowUsd: borrow,
        collateralDistribution,
        prices: {
          ...prev.prices,
          WETH: wethPrice,
          WBTC: wbtcPrice,
          USDC: 1.00
        }
      }));
    } catch(err) {
      console.error("Failed fetching user data", err);
    }
  }, []);

  return {
    data,
    setData,
    simEthPrice,
    setSimEthPrice,
    walletBalances,
    fetchUserData,
  };
}
