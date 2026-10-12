# Pyth Feed ID Generator

Generates a Rust `PYTH_ALLOWED_FEEDS` table (mint pubkey → 32-byte Pyth price feed ID) by
querying the [Pyth Hermes API](https://hermes.pyth.network) for each token's price feed ID.

This is useful for Solana programs that validate Pyth Push oracle updates against an
allow-list of `(Pubkey, [u8; 32])` pairs.

## Usage

```bash
node generate_feeds.mjs
```

This prints a Rust `&[(Pubkey, [u8; 32])]` slice to stdout, e.g.:

```rust
pub const PYTH_ALLOWED_FEEDS: &[(Pubkey, [u8; 32])] = &[
    // SOL/USD
    (
        pubkey!("So11111111111111111111111111111111111111112"),
        [
            0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4,
            ...
        ],
    ),
];
```

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

The script looks up each symbol's feed ID via Hermes' `/v2/price_feeds` endpoint, matching on
`attributes.base` and `attributes.quote_currency === "USD"`.

## Requirements

- Node.js 18+ (uses the built-in `fetch` API)
- Network access to `hermes.pyth.network`

## License

MIT
