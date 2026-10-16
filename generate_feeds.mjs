// generate_feeds.mjs
// Run with: npm install && node generate_feeds.mjs
//
// For each token below, looks up its Pyth price feed ID on Hermes, derives the Solana
// push-feed price account that Pyth sponsors for that feed (shard 0), checks that account
// exists on mainnet and is owned by the Pyth Receiver, and prints a Rust table of
// (mint, feed ID, price account) entries.

import { address, createSolanaRpc, getProgramDerivedAddress } from "@solana/kit";

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

// Pyth's push-oracle program: sponsored price accounts are its PDAs [shard_id u16 LE, feed_id].
// https://docs.pyth.network/price-feeds/core/push-feeds/solana - "The addresses represent the
// price feed account for shard 0 of the relevant price feed id."
const PUSH_ORACLE_PROGRAM = address("pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT");
// Owner of every price account the push oracle writes (and what a program should check).
const PYTH_RECEIVER_PROGRAM = "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ";
const SHARD_ID = 0;
// Any mainnet RPC; override with RPC_URL=... node generate_feeds.mjs
const rpc = createSolanaRpc(process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com");

function formatBytes(hexStr) {
  const clean = hexStr.replace(/^0x/, "");
  const bytes = clean.match(/.{1,2}/g).map((b) => `0x${b.toLowerCase()}`);
  const lines = [];
  for (let i = 0; i < 32; i += 8) {
    lines.push("            " + bytes.slice(i, i + 8).join(", "));
  }
  return `[\n${lines.join(",\n")},\n        ]`;
}

// Hermes search is fuzzy and its order isn't stable (a search for "MET" lists METIS/USD
// first), so only an exact "Crypto.<BASE>/USD" symbol counts - never the first result.
async function getFeedId(symbol) {
  const base = symbol.replace(/\/USD$/i, "").toUpperCase();
  const res = await fetch(`https://hermes.pyth.network/v2/price_feeds?query=${encodeURIComponent(base)}&asset_type=crypto`);
  if (!res.ok) throw new Error(`Hermes HTTP ${res.status}`);
  const feeds = await res.json();
  const match = feeds.find((f) => f.attributes?.symbol === `Crypto.${base}/USD`);
  if (!match) throw new Error(`no exact Crypto.${base}/USD feed (search returned: ${feeds.map((f) => f.attributes?.symbol).join(", ") || "nothing"})`);
  return match.id;
}

async function getPriceAccount(feedHex) {
  const feedId = Uint8Array.from(Buffer.from(feedHex.replace(/^0x/, ""), "hex"));
  const shard = new Uint8Array(2);
  new DataView(shard.buffer).setUint16(0, SHARD_ID, true);
  const [account] = await getProgramDerivedAddress({ programAddress: PUSH_ORACLE_PROGRAM, seeds: [shard, feedId] });
  return account;
}

async function main() {
  const rows = [];
  for (const token of tokens) {
    try {
      const feedHex = await getFeedId(token.symbol);
      rows.push({ ...token, feedHex, account: await getPriceAccount(feedHex) });
    } catch (err) {
      console.error(`// Skipped ${token.symbol}: ${err.message}`);
    }
  }

  // A feed Pyth doesn't sponsor on Solana has no account at the derived address - leave it
  // out rather than emit an address every price check would fail against.
  const { value: accounts } = await rpc.getMultipleAccounts(rows.map((r) => r.account), { encoding: "base64" }).send();
  const sponsored = rows.filter((r, i) => {
    const info = accounts[i];
    if (!info) console.error(`// Skipped ${r.symbol}: no sponsored price account at ${r.account}`);
    else if (info.owner !== PYTH_RECEIVER_PROGRAM) console.error(`// Skipped ${r.symbol}: ${r.account} is owned by ${info.owner}, not the Pyth Receiver`);
    return info && info.owner === PYTH_RECEIVER_PROGRAM;
  });

  console.log("// (token mint, Pyth price feed ID, Pyth push-feed price account for shard 0)");
  console.log("pub const PYTH_ALLOWED_FEEDS: &[(Pubkey, [u8; 32], Pubkey)] = &[");
  for (const r of sponsored) {
    console.log(`    // ${r.symbol}`);
    console.log(`    (\n        pubkey!("${r.mint}"),\n        ${formatBytes(r.feedHex)},\n        pubkey!("${r.account}"),\n    ),`);
  }
  console.log("];");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
