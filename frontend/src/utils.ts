export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getHealthStatus = (hf: number): 'danger' | 'warning' | 'safe' => {
  if (hf < 1.05) return 'danger';
  if (hf < 1.3) return 'warning';
  return 'safe';
};
