import { AlertTriangle } from 'lucide-react';

interface WarningBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function WarningBanner({ visible, onDismiss }: WarningBannerProps) {
  if (!visible) return null;

  return (
    <div className="warning-banner" style={{ background: 'rgba(245, 158, 11, 0.1)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="flex items-center gap-2 text-warning text-sm font-semibold">
        <AlertTriangle size={16} />
        <span>TESTNET NOTICE: We are currently utilizing custom mock WETH, WBTC, LINK, and USDC tokens to provide flexibility when testing the reactive liquidation engine. You can import these custom assets directly into your wallet.</span>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'var(--warning-yellow)', cursor: 'pointer', padding: '0.25rem' }}>
        &times;
      </button>
    </div>
  );
}
