# Pyth Feed ID Generator

Generates a Rust `PYTH_ALLOWED_FEEDS` table of `(mint, feed ID, price account)` entries:

- **feed ID** - the token's 32-byte Pyth price feed ID, from the [Pyth Hermes API](https://hermes.pyth.network).
- **price account** - the Solana account where Pyth's sponsored push feed for that ID is written
  (shard 0), derived from the feed ID and checked on mainnet.

They answer different questions, and a Solana program needs both:

| | Check |
|---|---|
| price account | the account passed in IS Pyth's sponsored account (`account.key() == price_account`) - not one the caller posted themselves |
| feed ID | the price inside that account is for this token (`price_message.feed_id == feed_id`) |

The feed ID is **not** an account address: read as a pubkey, it points at Pyth's old legacy
price account, owned by a different program.

## Usage

```bash
npm install
node generate_feeds.mjs
```

This prints a Rust `&[(Pubkey, [u8; 32], Pubkey)]` slice to stdout, e.g.:

```rust
pub const PYTH_ALLOWED_FEEDS: &[(Pubkey, [u8; 32], Pubkey)] = &[
    // SOL/USD
    (
        pubkey!("So11111111111111111111111111111111111111112"),
        [
            0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4,
            ...
        ],
        pubkey!("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"),
    ),
];
```

Tokens it can't resolve are left out, with the reason on stderr: no exact `Crypto.<TOKEN>/USD`
feed on Hermes, or no sponsored price account on Solana mainnet. The price accounts can be
compared with Pyth's published list: <https://docs.pyth.network/price-feeds/core/push-feeds/solana>.

Redirect to a file to save the output:

```bash
node generate_feeds.mjs > pyth_allowed_feeds.rs
```

## Adding / changing tokens

Edit the `tokens` array at the top of [generate_feeds.mjs](generate_feeds.mjs) with the
token's trading symbol (e.g. `"SOL/USD"`) and its mint address:

```js
const tokens = [
  { symbol: "SOL/USD", mint: "So11111111111111111111111111111111111111112" },
  // ...
];
```

The script looks up each symbol's feed ID via Hermes' `/v2/price_feeds` endpoint and accepts
only the exact `Crypto.<TOKEN>/USD` symbol. Hermes' search is fuzzy and its order isn't stable -
searching "MET" lists METIS/USD first - so it never falls back to the first result.

The price account is the push-oracle program's (`pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT`)
address for seeds `[shard_id (u16, little-endian), feed_id]` with shard 0.

## Requirements

- Node.js 18+ (uses the built-in `fetch` API)
- `npm install` (one dependency, `@solana/kit`, for the address derivation)
- Network access to `hermes.pyth.network` and a Solana mainnet RPC
  (default `https://api.mainnet-beta.solana.com`; override with `RPC_URL=... node generate_feeds.mjs`)

## License

MIT
