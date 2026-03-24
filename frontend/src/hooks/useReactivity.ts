import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ABIS } from '../contracts';
import type { ReactiveEvent } from '../types';
import { RPC_URL, BACKEND_PRIVATE_KEY } from '../constants';

interface UseReactivityParams {
  provider: ethers.BrowserProvider | null;
  walletAddress: string | null;
  fetchUserData: (address: string, provider: ethers.BrowserProvider) => Promise<void>;
}

export function useReactivity({ provider, walletAddress, fetchUserData }: UseReactivityParams) {
  const [reactiveEvents, setReactiveEvents] = useState<ReactiveEvent[]>([]);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [liquidationCountdown, setLiquidationCountdown] = useState<number | null>(null);
  const [hasLiquidated, setHasLiquidated] = useState(false);

  // Listen for Reactive Events
  useEffect(() => {
    if (!provider || !walletAddress) return;

    const engine = new ethers.Contract(
      CONTRACT_ADDRESSES['ReactiveLiquidationEngine'],
      ABIS['ReactiveLiquidationEngine'],
      provider
    );

    const handleEvent = (type: string, details: any, eventData?: any) => {
      setReactiveEvents(prev => {
        const eventId = eventData?.log?.transactionHash && eventData?.log?.index !== undefined
          ? `${eventData.log.transactionHash}-${eventData.log.index}`
          : `${type}-${Date.now()}`;

        if (prev.some(e => e.id === eventId)) return prev;

        return [{
          id: eventId,
          type,
          timestamp: new Date().toLocaleTimeString(),
          ...details
        }, ...prev].slice(0, 50);
      });
    };

    const onUserChecked = (user: string, hf: bigint, event: any) => {
      console.log("Reactivity: User Checked", user, hf);
      handleEvent('USER_CHECKED', { 
        user, 
        hf: Number(ethers.formatUnits(hf, 18)).toFixed(4) 
      }, event);
      if (user.toLowerCase() === walletAddress.toLowerCase()) {
        fetchUserData(walletAddress, provider);
      }
    };

    const onLiquidation = (user: string, hf: bigint, event: any) => {
      console.log("Reactivity: LIQUIDATION TRIGGERED", user);
      handleEvent('LIQUIDATION', { 
        user, 
        hf: Number(ethers.formatUnits(hf, 18)).toFixed(4) 
      }, event);
      if (user.toLowerCase() === walletAddress?.toLowerCase()) {
        setHasLiquidated(true);
      }
    };

    const onEventSuccess = (_emitter: string, count: bigint, event: any) => {
      handleEvent('SYNC_SUCCESS', { count: count.toString() }, event);
    };

    engine.on("DebugUserChecked", onUserChecked);
    engine.on("DebugLiquidationTriggered", onLiquidation);
    engine.on("DebugOnEventSuccess", onEventSuccess);

    return () => {
      engine.off("DebugUserChecked", onUserChecked);
      engine.off("DebugLiquidationTriggered", onLiquidation);
      engine.off("DebugOnEventSuccess", onEventSuccess);
    };
  }, [provider, walletAddress, fetchUserData]);

  const executeReactivity = useCallback(async () => {
    if (!walletAddress || !provider) return;
    setIsUpdatingPrice(true);
    try {
      const jsonRpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const backendSigner = new ethers.Wallet(BACKEND_PRIVATE_KEY, jsonRpcProvider);
      const oracle = new ethers.Contract(CONTRACT_ADDRESSES['ORACLE'], ABIS['ChainlinkPriceOracle'], backendSigner);
      
      console.log("Notifying Oracle of price update [AUTO-SIGNER]...");
      let tx = await oracle.notifyPriceUpdate(CONTRACT_ADDRESSES['WETH']);
      await tx.wait();
      
      await fetchUserData(walletAddress, provider);
    } catch (err) {
      console.error("Reactivity trigger failed", err);
    } finally {
      setIsUpdatingPrice(false);
    }
  }, [walletAddress, provider, fetchUserData]);

  // Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (liquidationCountdown !== null && liquidationCountdown > 0) {
      timer = setTimeout(() => {
        setLiquidationCountdown(liquidationCountdown - 1);
      }, 1000);
    } else if (liquidationCountdown === 0) {
      setLiquidationCountdown(null);
      executeReactivity();
    }
    return () => clearTimeout(timer);
  }, [liquidationCountdown, executeReactivity]);

  return {
    reactiveEvents,
    isUpdatingPrice,
    setIsUpdatingPrice,
    liquidationCountdown,
    setLiquidationCountdown,
    hasLiquidated,
    setHasLiquidated,
    executeReactivity,
  };
}
