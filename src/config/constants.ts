export const DYNAMIC_FEES = {
  BTC: { BTC: { fee: 10.00, minAmount: 20.00, time: "10-30 mins" } },
  USDT: {
    TRC20: { fee: 1.50, minAmount: 10.00, time: "1-3 mins" },
    POLYGON: { fee: 0.50, minAmount: 5.00, time: "Instant" },
    BEP20: { fee: 0.80, minAmount: 5.00, time: "1-2 mins" },
    SOL: { fee: 1.00, minAmount: 5.00, time: "Instant" },
  },
  ETH: { ERC20: { fee: 5.00, minAmount: 15.00, time: "3-5 mins" } },
} as const;

export const SUPPORT_EMAIL = "ceo.exchange.web@gmail.com";
export const SUPPORT_WHATSAPP = "https://chat.whatsapp.com/GXOUVSkLqXGC9vq76e9jDD";
export const SUPPORT_WHATSAPP_DISPLAY = "CEO Exchange WhatsApp Group";
export const TELEGRAM_COMMUNITY = "https://t.me/+-cQQMpJQAcxhNjlk";

export const OWNER_EMAIL = "gojoexpresscom@gmail.com";
export const FLAT_FEE_USD = 1.00; // $1 flat fee for all standard users
export const CONVERT_FEE_RATE = 0; // No percentage fee on convert — flat fee only
export const WITHDRAWAL_FEE_RATE = 0; // No percentage fee — flat fee only

export const BINANCE_SYMBOLS = [
  { symbol: "BTCUSDT", display: "BTC/USDT", base: "BTC" },
  { symbol: "ETHUSDT", display: "ETH/USDT", base: "ETH" },
  { symbol: "BNBUSDT", display: "BNB/USDT", base: "BNB" },
  { symbol: "SOLUSDT", display: "SOL/USDT", base: "SOL" },
  { symbol: "XRPUSDT", display: "XRP/USDT", base: "XRP" },
  { symbol: "DOGEUSDT", display: "DOGE/USDT", base: "DOGE" },
  { symbol: "ADAUSDT", display: "ADA/USDT", base: "ADA" },
  { symbol: "AVAXUSDT", display: "AVAX/USDT", base: "AVAX" },
];

export const EARN_PRODUCTS = [
  { coin: "USDT", apy: "12.5", type: "Flexible", minAmount: 10 },
  { coin: "BTC", apy: "4.2", type: "Fixed 30D", minAmount: 0.001 },
  { coin: "ETH", apy: "6.8", type: "Fixed 14D", minAmount: 0.01 },
  { coin: "SOL", apy: "9.1", type: "Flexible", minAmount: 0.5 },
];
