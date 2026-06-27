// Cost per unit for each service (update when pricing changes)
export const COST_RATES = {
  whisper:        { per: 'minute',    usd: 0.006   },  // $0.006 / min
  'gpt-4o':       { per: '1k_tokens', usd: 0.005   },  // $5 / 1M tokens (blended in/out)
  'gemini-flash': { per: '1k_tokens', usd: 0.00015 },  // $0.15 / 1M tokens
  'claude-sonnet':{ per: '1k_tokens', usd: 0.003   },  // $3 / 1M tokens (blended)
};

const USD_TO_INR = 83.5;

export function formatINR(usd) {
  if (usd == null) return '—';
  const inr = Number(usd) * USD_TO_INR;
  if (inr < 0.01) return `₹${inr.toFixed(4)}`;
  if (inr < 1)    return `₹${inr.toFixed(2)}`;
  return `₹${inr.toFixed(0)}`;
}

// Keep as secondary reference label
export function formatUSD(usd) {
  if (usd == null) return '—';
  const n = Number(usd);
  return `$${n.toFixed(n < 0.01 ? 5 : n < 1 ? 4 : 2)}`;
}
