import { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contracts';

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  const connectWallet = async (onConnected: (address: string, provider: ethers.BrowserProvider) => void) => {
    setIsConnecting(true);
    try {
      // @ts-ignore
      if (window.ethereum) {
        // @ts-ignore
        const _provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(_provider);
        const accounts = await _provider.send("eth_requestAccounts", []);
        setWalletAddress(accounts[0]);
        await onConnected(accounts[0], _provider);
      } else {
        alert("Please install MetaMask to use Voltiq!");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsConnecting(false);
    }
  };

  const importMockTokens = async () => {
    // @ts-ignore
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }

    const tokensToImport = [
      { symbol: 'WETH', address: CONTRACT_ADDRESSES['WETH'] },
      { symbol: 'WBTC', address: CONTRACT_ADDRESSES['WBTC'] },
      { symbol: 'USDC', address: CONTRACT_ADDRESSES['USDC'] },
    ];

    for (const token of tokensToImport) {
      try {
        // @ts-ignore
        await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: token.address,
              symbol: token.symbol,
              decimals: 18,
            },
          },
        });
      } catch (err) {
        console.error(`Failed to import ${token.symbol}`, err);
      }
    }
  };

  return {
    walletAddress,
    isConnecting,
    provider,
    connectWallet,
    importMockTokens,
  };
}
