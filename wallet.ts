import { ethers } from 'ethers';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { HDNodeWallet } from 'ethers';

const STORAGE_KEY = 'ceo_wallet_encrypted';
const SALT_KEY = 'ceo_wallet_salt';

export type WalletData = {
  address: string;
  encryptedMnemonic: string;
  publicKey: string;
  createdAt: string;
};

export type ChainConfig = {
  id: string;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  decimals: number;
};

export const SUPPORTED_CHAINS: ChainConfig[] = [
  { id: '1', name: 'Ethereum', symbol: 'ETH', rpcUrl: 'https://eth.llamarpc.com', explorerUrl: 'https://etherscan.io', decimals: 18 },
  { id: '56', name: 'BNB Smart Chain', symbol: 'BNB', rpcUrl: 'https://bsc-dataseed.binance.org', explorerUrl: 'https://bscscan.com', decimals: 18 },
  { id: '137', name: 'Polygon', symbol: 'MATIC', rpcUrl: 'https://polygon-rpc.com', explorerUrl: 'https://polygonscan.com', decimals: 18 },
  { id: '43114', name: 'Avalanche', symbol: 'AVAX', rpcUrl: 'https://api.avax.network/ext/bc/C/rpc', explorerUrl: 'https://snowtrace.io', decimals: 18 },
  { id: '8453', name: 'Base', symbol: 'ETH', rpcUrl: 'https://mainnet.base.org', explorerUrl: 'https://basescan.org', decimals: 18 },
];

export const ERC20_TOKENS: Record<string, Array<{ symbol: string; address: string; decimals: number; name: string; logo?: string }>> = {
  '1': [
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, name: 'Tether USD' },
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, name: 'USD Coin' },
    { symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, name: 'Chainlink' },
    { symbol: 'UNI', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, name: 'Uniswap' },
  ],
  '56': [
    { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, name: 'Binance-Peg USD Tether' },
    { symbol: 'USDC', address: '0x8AC76A51cc950d9822D68b8EFc1Dbb8c11Bf55b1', decimals: 18, name: 'Binance-Peg USD Coin' },
  ],
  '137': [
    { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb95BEd684', decimals: 6, name: 'Tether USD' },
    { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9c9608f6aA8', decimals: 6, name: 'USD Coin' },
  ],
  '43114': [
    { symbol: 'USDT', address: '0xc7198437980c041c80fa3761cbb1f65475f0a1e7', decimals: 6, name: 'Tether USD' },
    { symbol: 'USDC', address: '0xB97EF9Ef8734C71904d3340d00e85411f0c11c79', decimals: 6, name: 'USD Coin' },
  ],
  '8453': [
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, name: 'USD Coin' },
  ],
};

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

export function generateNewMnemonic(strength: 128 | 256 = 128): string {
  return generateMnemonic(strength);
}

export function validateMnemonicPhrase(mnemonic: string): boolean {
  return validateMnemonic(mnemonic.trim());
}

export function getWalletFromMnemonic(mnemonic: string, path = "m/44'/60'/0'/0/0"): HDNodeWallet {
  if (!validateMnemonicPhrase(mnemonic)) throw new Error('Invalid mnemonic phrase');
  const seed = mnemonicToSeedSync(mnemonic);
  const root = HDNodeWallet.fromSeed(seed);
  return root.derivePath(path);
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
}

export async function encryptMnemonic(mnemonic: string, password: string): Promise<WalletData> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(mnemonic));
  const wallet = getWalletFromMnemonic(mnemonic);
  return {
    address: wallet.address,
    encryptedMnemonic: `${toHex(salt)}:${toHex(iv)}:${toHex(new Uint8Array(ciphertext))}`,
    publicKey: wallet.signingKey.publicKey,
    createdAt: new Date().toISOString(),
  };
}

export async function decryptMnemonic(encryptedData: string, password: string): Promise<string> {
  const [saltHex, ivHex, cipherHex] = encryptedData.split(':');
  const salt = fromHex(saltHex);
  const iv = fromHex(ivHex);
  const cipher = fromHex(cipherHex);
  const key = await deriveKey(password, salt);
  const dec = new TextDecoder();
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return dec.decode(plain);
}

export function saveWalletToStorage(data: WalletData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getWalletFromStorage(): WalletData | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as WalletData; } catch { return null; }
}

export function clearWalletFromStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SALT_KEY);
}

export function getProvider(chainId: string): ethers.JsonRpcProvider {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
  if (!chain) throw new Error('Unsupported chain');
  return new ethers.JsonRpcProvider(chain.rpcUrl);
}

export type TokenBalance = {
  symbol: string;
  name: string;
  balance: string;
  balanceUsd: number | null;
  decimals: number;
  address: string | null;
  chainId: string;
  logoUrl?: string;
};

export type WalletBalance = {
  nativeBalance: string;
  nativeSymbol: string;
  nativeBalanceUsd: number | null;
  tokens: TokenBalance[];
  chainId: string;
};

const PRICE_CACHE: Record<string, { price: number; ts: number }> = {};
const PRICE_TTL = 60_000;

async function getTokenPrice(symbol: string): Promise<number | null> {
  const now = Date.now();
  const cached = PRICE_CACHE[symbol];
  if (cached && now - cached.ts < PRICE_TTL) return cached.price;
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${mapCoinGeckoId(symbol)}&vs_currencies=usd`);
    if (!res.ok) return null;
    const data = await res.json();
    const id = mapCoinGeckoId(symbol);
    const price = data[id]?.usd;
    if (price) { PRICE_CACHE[symbol] = { price, ts: now }; return price; }
    return null;
  } catch { return null; }
}

function mapCoinGeckoId(symbol: string): string {
  const map: Record<string, string> = {
    ETH: 'ethereum', BNB: 'binancecoin', MATIC: 'matic-network', AVAX: 'avalanche-2',
    USDT: 'tether', USDC: 'usd-coin', LINK: 'chainlink', UNI: 'uniswap', BTC: 'bitcoin',
  };
  return map[symbol] || symbol.toLowerCase();
}

export async function fetchBalances(address: string, chainId: string): Promise<WalletBalance> {
  const provider = getProvider(chainId);
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)!;
  const nativeBal = await provider.getBalance(address);
  const nativeBalance = ethers.formatEther(nativeBal);
  const nativePrice = await getTokenPrice(chain.symbol);
  const tokens: TokenBalance[] = [];
  const tokenList = ERC20_TOKENS[chainId] || [];
  for (const token of tokenList) {
    try {
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const [bal] = await Promise.all([contract.balanceOf(address) as Promise<bigint>]);
      const formatted = ethers.formatUnits(bal, token.decimals);
      if (parseFloat(formatted) > 0) {
        const price = await getTokenPrice(token.symbol);
        tokens.push({
          symbol: token.symbol, name: token.name, balance: formatted,
          balanceUsd: price ? parseFloat(formatted) * price : null,
          decimals: token.decimals, address: token.address, chainId,
        });
      }
    } catch { /* ignore individual token errors */ }
  }
  return {
    nativeBalance, nativeSymbol: chain.symbol,
    nativeBalanceUsd: nativePrice ? parseFloat(nativeBalance) * nativePrice : null,
    tokens, chainId,
  };
}

export type SendResult = { txHash: string; explorerUrl: string };

export async function sendNative(
  mnemonic: string, to: string, amount: string, chainId: string,
): Promise<SendResult> {
  const wallet = getWalletFromMnemonic(mnemonic);
  const provider = getProvider(chainId);
  const signer = wallet.connect(provider);
  const tx = await signer.sendTransaction({ to, value: ethers.parseEther(amount) });
  await tx.wait();
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)!;
  return { txHash: tx.hash, explorerUrl: `${chain.explorerUrl}/tx/${tx.hash}` };
}

export async function sendERC20(
  mnemonic: string, tokenAddress: string, to: string, amount: string,
  decimals: number, chainId: string,
): Promise<SendResult> {
  const wallet = getWalletFromMnemonic(mnemonic);
  const provider = getProvider(chainId);
  const signer = wallet.connect(provider);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const tx = await contract.transfer(to, ethers.parseUnits(amount, decimals)) as ethers.TransactionResponse;
  await tx.wait();
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)!;
  return { txHash: tx.hash, explorerUrl: `${chain.explorerUrl}/tx/${tx.hash}` };
}

export async function estimateGas(to: string, value: string, chainId: string): Promise<{ gasPrice: string; gasCost: string }> {
  const provider = getProvider(chainId);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  const gasLimit = 21000n;
  const gasCost = gasPrice * gasLimit;
  return {
    gasPrice: ethers.formatEther(gasPrice),
    gasCost: ethers.formatEther(gasCost),
  };
}

export type FeeOption = { label: string; multiplier: number; description: string };
export const FEE_OPTIONS: FeeOption[] = [
  { label: 'Standard', multiplier: 1, description: '~5 min' },
  { label: 'Fast', multiplier: 1.2, description: '~1 min' },
  { label: 'Instant', multiplier: 1.5, description: '~15 sec' },
];

export async function sendWithFee(
  mnemonic: string, to: string, amount: string, chainId: string,
  feeMultiplier: number, tokenAddress?: string, decimals?: number,
): Promise<SendResult> {
  const provider = getProvider(chainId);
  const wallet = getWalletFromMnemonic(mnemonic);
  const signer = wallet.connect(provider);
  const feeData = await provider.getFeeData();
  const baseGasPrice = feeData.gasPrice || 0n;
  const adjustedGasPrice = (baseGasPrice * BigInt(Math.round(feeMultiplier * 100))) / 100n;

  if (tokenAddress && decimals !== undefined) {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const tx = await contract.transfer(to, ethers.parseUnits(amount, decimals), { gasPrice: adjustedGasPrice }) as ethers.TransactionResponse;
    await tx.wait();
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)!;
    return { txHash: tx.hash, explorerUrl: `${chain.explorerUrl}/tx/${tx.hash}` };
  } else {
    const tx = await signer.sendTransaction({ to, value: ethers.parseEther(amount), gasPrice: adjustedGasPrice });
    await tx.wait();
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)!;
    return { txHash: tx.hash, explorerUrl: `${chain.explorerUrl}/tx/${tx.hash}` };
  }
}

export function shortenAddress(addr: string, chars = 6): string {
  if (!addr) return '';
  return `${addr.slice(0, chars)}...${addr.slice(-4)}`;
}

export function validateAddress(addr: string, chainId: string): boolean {
  if (chainId === '1' || chainId === '56' || chainId === '137' || chainId === '43114' || chainId === '8453') {
    return ethers.isAddress(addr);
  }
  return addr.length > 20;
}
