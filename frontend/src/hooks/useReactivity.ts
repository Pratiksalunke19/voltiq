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

    const handleEvent = (type: string, details: Record<string, unknown>) => {
      setReactiveEvents(prev => {
        const id = (details.id as string) || `${Date.now()}-${Math.random()}`;
        if (prev.some(e => e.id === id)) return prev;
        
        return [{
          id,
          type,
          timestamp: details.timestamp || Date.now(),
          ...details
        } as ReactiveEvent, ...prev].slice(0, 50);
      });
    };

    const loadHistory = async () => {
      try {
        const pool = new ethers.Contract(CONTRACT_ADDRESSES['LendingPool'], ABIS['LendingPool'], provider);
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 5000);
        
        const hist: Record<string, unknown>[] = [];
        const eventTypes = ['Deposited', 'Withdrawn', 'Borrowed', 'Repaid'];
        
        for (const ev of eventTypes) {
          const logs = await pool.queryFilter(ev, fromBlock, currentBlock);
          for (const l of logs) {
            if (!('args' in l)) continue;
            const user = l.args[0];
            if (user.toLowerCase() === walletAddress.toLowerCase()) {
              const assetAddr = l.args[1];
              const symbol = Object.keys(CONTRACT_ADDRESSES).find(key => CONTRACT_ADDRESSES[key as keyof typeof CONTRACT_ADDRESSES].toLowerCase() === assetAddr.toLowerCase()) || 'TOKEN';
              hist.push({
                id: `${ev}-${l.blockNumber}-${l.transactionIndex}`,
                type: ev.toUpperCase(),
                timestamp: Date.now() - (currentBlock - l.blockNumber) * 1000,
                asset: symbol,
                amount: Number(ethers.formatUnits(l.args[2], 18)).toFixed(4),
                isUser: true,
                blockNum: l.blockNumber,
                txHash: l.transactionHash
              });
            }
          }
        }
        
        hist.sort((a, b) => (a.blockNum as number) - (b.blockNum as number));
        hist.forEach(h => handleEvent(h.type as string, h));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };
    
    loadHistory();

    const onUserChecked = (user: string, hf: bigint, event: any) => {
      console.log("Reactivity: User Checked", user, hf);
      handleEvent('USER_CHECKED', { 
        id: `USER_CHECKED-${event?.log?.transactionHash || event?.transactionHash}-${event?.log?.index || Math.random()}`,
        user, 
        hf: Number(ethers.formatUnits(hf, 18)).toFixed(4),
        txHash: event?.log?.transactionHash || event?.transactionHash
      });
      if (user.toLowerCase() === walletAddress.toLowerCase()) {
        fetchUserData(walletAddress, provider);
      }
    };

    const onLiquidation = (user: string, hf: bigint, event: any) => {
      console.log("Reactivity: LIQUIDATION TRIGGERED", user);
      handleEvent('LIQUIDATION', { 
        id: `LIQUIDATION-${event?.log?.transactionHash || event?.transactionHash}-${event?.log?.index || Math.random()}`,
        user, 
        hf: Number(ethers.formatUnits(hf, 18)).toFixed(4),
        isUser: user.toLowerCase() === walletAddress?.toLowerCase(),
        txHash: event?.log?.transactionHash || event?.transactionHash
      });
      if (user.toLowerCase() === walletAddress?.toLowerCase()) {
        setHasLiquidated(true);
      }
    };

    const onEventSuccess = (_emitter: string, count: bigint, event: any) => {
      handleEvent('SYNC_SUCCESS', { 
        id: `SYNC_SUCCESS-${event?.log?.transactionHash || event?.transactionHash}-${event?.log?.index || Math.random()}`,
        count: count.toString(),
        txHash: event?.log?.transactionHash || event?.transactionHash
      });
    };

    engine.on("DebugUserChecked", onUserChecked);
    engine.on("DebugLiquidationTriggered", onLiquidation);
    engine.on("DebugOnEventSuccess", onEventSuccess);

    const pool = new ethers.Contract(CONTRACT_ADDRESSES['LendingPool'], ABIS['LendingPool'], provider);
    const onPoolAction = (type: string) => (...args: any[]) => {
      const eventInfo = args[args.length - 1];
      const user = args[0] as string;
      const asset = args[1] as string;
      const amount = args[2] as bigint;
      
      if (user.toLowerCase() === walletAddress?.toLowerCase()) {
        const symbol = Object.keys(CONTRACT_ADDRESSES).find(key => CONTRACT_ADDRESSES[key as keyof typeof CONTRACT_ADDRESSES].toLowerCase() === asset.toLowerCase()) || 'TOKEN';
        handleEvent(type.toUpperCase(), {
          id: `${type}-${eventInfo.log?.blockNumber || Date.now()}-${eventInfo.log?.transactionIndex || Math.random()}`,
          asset: symbol,
          amount: Number(ethers.formatUnits(amount, 18)).toFixed(4),
          isUser: true,
          txHash: eventInfo.log?.transactionHash || eventInfo.transactionHash
        });
      }
    };

    const depFn = onPoolAction('Deposited');
    const withFn = onPoolAction('Withdrawn');
    const borFn = onPoolAction('Borrowed');
    const repFn = onPoolAction('Repaid');

    pool.on('Deposited', depFn);
    pool.on('Withdrawn', withFn);
    pool.on('Borrowed', borFn);
    pool.on('Repaid', repFn);

    return () => {
      engine.off("DebugUserChecked", onUserChecked);
      engine.off("DebugLiquidationTriggered", onLiquidation);
      engine.off("DebugOnEventSuccess", onEventSuccess);
      pool.off('Deposited', depFn);
      pool.off('Withdrawn', withFn);
      pool.off('Borrowed', borFn);
      pool.off('Repaid', repFn);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, walletAddress]);

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
