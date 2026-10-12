// generate_feeds.mjs
// Run with: node generate_feeds.mjs

const tokens = [
  { symbol: "BONK/USD", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "MEW/USD",  mint: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5" },
  { symbol: "JUP/USD",  mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
  { symbol: "PYTH/USD", mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3" },
  { symbol: "WIF/USD",  mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
  { symbol: "MNDE/USD", mint: "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey" },
  { symbol: "TRUMP/USD",mint: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN" },
  { symbol: "FARTCOIN/USD", mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump" },
  { symbol: "PUMP/USD", mint: "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn" },
  { symbol: "RENDER/USD", mint: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof" },
  { symbol: "MET/USD",  mint: "METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL" },
  { symbol: "CLOUD/USD",mint: "CLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu" },
  { symbol: "HYPE/USD", mint: "98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g" },
  { symbol: "SOL/USD",  mint: "So11111111111111111111111111111111111111112" },
];

function formatBytes(hexStr) {
  const clean = hexStr.replace(/^0x/, "");
  const bytes = clean.match(/.{1,2}/g).map((b) => `0x${b.toLowerCase()}`);
  const lines = [];
  for (let i = 0; i < 32; i += 8) {
    lines.push("            " + bytes.slice(i, i + 8).join(", "));
  }
  return `[\n${lines.join(",\n")},\n        ]`;
}

async function getFeedId(symbol) {
  const res = await fetch(`https://hermes.pyth.network/v2/price_feeds?query=${symbol}&asset_type=crypto`);
  const feeds = await res.json();
  const match = feeds.find((f) => f.attributes.base?.toUpperCase() === symbol.toUpperCase() && f.attributes.quote_currency === "USD") || feeds[0];
  if (!match) throw new Error(`Feed not found for ${symbol}`);
  return match.id;
}

async function main() {
  console.log("pub const PYTH_ALLOWED_FEEDS: &[(Pubkey, [u8; 32])] = &[");
  for (const token of tokens) {
    try {
      const feedHex = await getFeedId(token.symbol);
      console.log(`    // ${token.symbol}/USD`);
      console.log(`    (\n        pubkey!("${token.mint}"),\n        ${formatBytes(feedHex)},\n    ),`);
    } catch (err) {
      console.error(`    // Error fetching ${token.symbol}: ${err.message}`);
    }
  }
  console.log("];");
}

main();