// Cost per unit for each service (update when pricing changes)
export const COST_RATES = {
  whisper:        { per: 'minute',   usd: 0.006  },  // $0.006 / min
  'gpt-4o':       { per: '1k_tokens', usd: 0.005 },  // $5 / 1M tokens (blended in/out)
  'gemini-flash': { per: '1k_tokens', usd: 0.00015 }, // $0.15 / 1M tokens
  'claude-sonnet':{ per: '1k_tokens', usd: 0.003  },  // $3 / 1M tokens (blended)
};

export function formatUSD(cents) {
  if (cents == null) return '—';
  const n = Number(cents);
  if (n < 0.01) return `$${n.toFixed(5)}`;
  if (n < 1)    return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export function formatINR(usd) {
  const inr = Number(usd) * 83.5;
  return `₹${inr.toFixed(0)}`;
}
