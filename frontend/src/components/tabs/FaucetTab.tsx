import { useState } from 'react';
import { Coins } from 'lucide-react';

interface FaucetTabProps {
  walletAddress: string | null;
  walletBalances: Record<string, string>;
  handleMint: (amount: string, asset: string) => void;
}

export default function FaucetTab({
  walletAddress,
  walletBalances,
  handleMint,
}: FaucetTabProps) {
  const [mintAmount, setMintAmount] = useState('1000');
  const [mintAsset, setMintAsset] = useState('USDC');

  return (
    <div className="max-width-600" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><Coins size={22} className="text-warning" /> Testnet Faucet</h3>
        </div>
        <p className="text-sm text-secondary mb-6">
          Voltiq is currently on testnet. Use this faucet to mint mock tokens so you can test the supply and borrow functionality.
        </p>

        <div className="form-group">
          <label className="input-label">Asset to Mint</label>
          <select 
            className="select-field" 
            value={mintAsset} 
            onChange={(e) => setMintAsset(e.target.value)}
          >
            <option value="WETH">WETH</option>
            <option value="WBTC">WBTC</option>
            <option value="USDC">USDC</option>
          </select>
        </div>

        <div className="form-group">
          <label className="input-label">Amount</label>
          <div className="input-group">
            <input 
              type="number" 
              className="input-field" 
              value={mintAmount} 
              onChange={(e) => setMintAmount(e.target.value)}
            />
            <span className="input-suffix">{mintAsset}</span>
          </div>
        </div>

        <button 
          className="btn btn-primary w-full mt-2" 
          onClick={() => handleMint(mintAmount, mintAsset)}
          disabled={!walletAddress || !mintAmount}
        >
          Mint Mock {mintAsset}
        </button>

        <div className="mt-8 border-t border-dashed border-white/10 pt-6">
          <h4 className="text-xs font-bold text-secondary uppercase mb-3 text-center">Your Balances</h4>
          <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="bg-panel p-3 rounded-lg flex justify-between">
              <span className="text-sm">WETH</span>
              <span className="font-mono text-sm">{walletBalances.WETH}</span>
            </div>
            <div className="bg-panel p-3 rounded-lg flex justify-between">
              <span className="text-sm">WBTC</span>
              <span className="font-mono text-sm">{walletBalances.WBTC}</span>
            </div>
            <div className="bg-panel p-3 rounded-lg flex justify-between">
              <span className="text-sm">USDC</span>
              <span className="font-mono text-sm">{walletBalances.USDC}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
