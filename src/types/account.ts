export interface Journal {
  id: string;
  name: string;
  initialCapital: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

// Keep for compatibility with existing DB/calculations layer
export interface AccountConfig {
  journalName: string;
  initialCapital: number;
  riskPerTrade: number;
  currency: string;
}

export function journalToConfig(j: Journal): AccountConfig {
  return {
    journalName: j.name,
    initialCapital: j.initialCapital,
    riskPerTrade: 100,
    currency: j.currency,
  };
}
