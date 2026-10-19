# Deploying Generative3DNFTv2 (Remix)

The V2 contract adds what V1 can't do: `updateTokenURI` (updatable metadata)
and a per-token additional file registry (`addTokenFile` / `removeTokenFile` /
`getTokenFiles`). V1 is already deployed and immutable, so V2 is a fresh
deployment — then the app automatically mints against it.

## 1. Deploy via Remix IDE

1. Open https://remix.ethereum.org
2. Create `Generative3DNFTv2.sol` and paste the contents of
   `contracts/Generative3DNFTv2.sol`
3. Remix will prompt to import OpenZeppelin — allow it, or install via:
   File Explorer → search `@openzeppelin/contracts` (Remix handles the rest)
4. Compile with Solidity **0.8.24 or newer** (0.8.28 tested)
5. Deploy tab → Environment: **Injected Provider – MetaMask**
6. Network: **Polygon Amoy** first (free testnet MATIC from https://faucet.polygon.technology)
7. Constructor args:
   - `initialOwner`: your wallet address
   - `initialMintPrice`: mint price in wei (e.g. `50000000000000000` = 0.05 POL)
   - `collectionMaxSupply`: e.g. `10000`
8. Deploy → copy the contract address

## 2. Point the app at V2

In `src/contracts/contractConfig.ts`, fill in `CONTRACT_ADDRESSES_V2`:

```ts
export const CONTRACT_ADDRESSES_V2: Record<number, `0x${string}`> = {
  137: '0xYOUR_MAINNET_V2_ADDRESS',
  80002: '0xYOUR_AMOY_V2_ADDRESS',
};
```

That's it. The minting terminal, gallery manager, and contract badge all switch
to V2 automatically (`getContractAddress` / `isV2Deployed`).

## 3. Verify (optional but recommended)

Flatten or use Remix's "Verify on Polygonscan" plugin so the collection shows
a verified badge on https://amoy.polygonscan.com.

## 4. Mainnet

Repeat step 1 on Polygon Mainnet when ready. Real POL required for gas.

## What V2 gives each NFT

- `updateTokenURI(tokenId, newURI)` — token owner or contract owner can repoint
  metadata (e.g. after re-pinning an enriched metadata JSON). No re-mint.
- `addTokenFile(tokenId, uri, fileType, name)` — attach extra files any time:
  higher-res GLBs, PBR texture packs, audio tracks, preview renders.
- `getTokenFiles(tokenId)` / `tokenFileCount(tokenId)` — read the registry.
- `removeTokenFile(tokenId, index)` — detach a file (swap-and-pop).
- All V1 behavior preserved: `mintNFT`, `mintPrice`, `maxSupply`, `withdraw`.

The in-app **Manage** button (gallery → Manage) exposes all of this once V2 is
deployed. Until then it shows a "deploy V2" notice and minting stays on V1.
