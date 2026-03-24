import { Database } from 'lucide-react';

interface PlaceholderTabProps {
  tabName: string;
}

export default function PlaceholderTab({ tabName }: PlaceholderTabProps) {
  return (
    <div className="flex flex-col items-center justify-center p-20 opacity-40">
      <Database size={64} className="mb-4" />
      <h3>{tabName.charAt(0).toUpperCase() + tabName.slice(1)} Module</h3>
      <p>Coming soon to Voltiq Protocol</p>
    </div>
  );
}
