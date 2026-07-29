const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBase58(hex: string, targetLen: number): string {
  let n = BigInt('0x' + hex);
  let out = '';
  while (n > 0n) { out = BASE58[Number(n % 58n)] + out; n /= 58n; }
  while (out.length < targetLen) out = '1' + out;
  return out.slice(0, targetLen);
}

export async function generateDepositAddress(userId: string, coin: string, network: string): Promise<string> {
  const seed = `ceo_exchange:${userId}:${coin}:${network}:v1`;
  const hex = await sha256(seed);
  const hex2 = await sha256(hex + seed);
  const full = hex + hex2; // 128 hex chars

  switch (network) {
    case 'BTC':   return '1' + hexToBase58(full.slice(0, 48), 33);
    case 'LTC':   return 'L' + hexToBase58(full.slice(8, 56), 33);
    case 'TRC20': return 'T' + hexToBase58(full.slice(4, 52), 33);
    case 'SOL':   return hexToBase58(full.slice(0, 64), 44);
    case 'XRP':   return 'r' + hexToBase58(full.slice(2, 50), 25);
    case 'ADA':   return 'addr1' + full.slice(0, 58);
    case 'DOT':   return '1' + hexToBase58(full.slice(0, 50), 47);
    case 'AVAX':  return 'X-avax1' + hexToBase58(full.slice(0, 48), 39);
    case 'ATOM':  return 'cosmos1' + full.slice(0, 38);
    default:      return '0x' + full.slice(0, 40); // ERC20, BEP20, MATIC, etc.
  }
}

export const DEPOSIT_COINS = [
  { id: 'USDT', name: 'Tether USD', networks: ['TRC20', 'ERC20', 'BEP20'], minDeposit: 1, fee: 0 },
  { id: 'BTC',  name: 'Bitcoin',    networks: ['BTC'],                      minDeposit: 0.0001, fee: 0 },
  { id: 'ETH',  name: 'Ethereum',   networks: ['ERC20'],                    minDeposit: 0.001, fee: 0 },
  { id: 'BNB',  name: 'BNB',        networks: ['BEP20'],                    minDeposit: 0.01, fee: 0 },
  { id: 'SOL',  name: 'Solana',     networks: ['SOL'],                      minDeposit: 0.01, fee: 0 },
  { id: 'XRP',  name: 'XRP',        networks: ['XRP'],                      minDeposit: 1, fee: 0 },
  { id: 'ADA',  name: 'Cardano',    networks: ['ADA'],                      minDeposit: 2, fee: 0 },
  { id: 'AVAX', name: 'Avalanche',  networks: ['AVAX'],                     minDeposit: 0.1, fee: 0 },
  { id: 'DOT',  name: 'Polkadot',   networks: ['DOT'],                      minDeposit: 0.1, fee: 0 },
  { id: 'TRX',  name: 'TRON',       networks: ['TRC20'],                    minDeposit: 10, fee: 0 },
  { id: 'DOGE', name: 'Dogecoin',   networks: ['BEP20'],                    minDeposit: 10, fee: 0 },
  { id: 'MATIC',name: 'Polygon',    networks: ['ERC20', 'BEP20'],           minDeposit: 1, fee: 0 },
  { id: 'LINK', name: 'Chainlink',  networks: ['ERC20'],                    minDeposit: 0.5, fee: 0 },
  { id: 'LTC',  name: 'Litecoin',   networks: ['LTC'],                      minDeposit: 0.01, fee: 0 },
  { id: 'ATOM', name: 'Cosmos',     networks: ['ATOM'],                     minDeposit: 0.1, fee: 0 },
];

export const NETWORK_LABELS: Record<string, string> = {
  TRC20: 'TRON (TRC20)', ERC20: 'Ethereum (ERC20)', BEP20: 'BNB Chain (BEP20)',
  BTC: 'Bitcoin Network', SOL: 'Solana', XRP: 'XRP Ledger',
  ADA: 'Cardano', DOT: 'Polkadot', AVAX: 'Avalanche C-Chain',
  ATOM: 'Cosmos Hub', LTC: 'Litecoin Network',
};

export const NETWORK_CONFIRMATIONS: Record<string, string> = {
  TRC20: '1 confirmation (~1 min)', ERC20: '12 confirmations (~3 min)',
  BEP20: '15 confirmations (~1 min)', BTC: '2 confirmations (~20 min)',
  SOL: '32 confirmations (~15 sec)', XRP: '1 confirmation (~5 sec)',
  ADA: '15 confirmations (~5 min)', DOT: '1 confirmation (~1 min)',
  AVAX: '1 confirmation (~2 sec)', ATOM: '1 confirmation (~7 sec)',
  LTC: '6 confirmations (~15 min)',
};
