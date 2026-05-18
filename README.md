# Perps Exchange — Perpetual Futures Backend

A perpetual futures trading engine built with Bun + TypeScript + Express. Supports order placement, order matching, position management, and liquidation.

## What is a Perpetual Future?

A perpetual future (perp) is a derivative that lets you trade an asset with leverage and no expiry date. You can go LONG (profit when price rises) or SHORT (profit when price falls). The exchange uses a **funding rate** to keep the perp price anchored to spot.

## Tech Stack

- **Runtime** — [Bun]
- **Framework** — Express
- **Language** — TypeScript
- **Storage** — In-memory (Redis + Postgres coming soon)

## Project Structure

```
prep-v1/
├── index.ts                  ← entry point, route registration
└── src/
    ├── types.ts              ← all TypeScript interfaces
    ├── store.ts              ← in-memory data store
    ├── middleware/
    │   └── auth.ts           ← userId header validation
    ├── routes/
    │   ├── auth.ts           ← signup, signin
    │   ├── wallet.ts         ← onramp, equity
    │   ├── orders.ts         ← place, cancel, query orders
    │   ├── positions.ts      ← open/closed positions
    │   └── fills.ts          ← trade fill history
    └── engine/
        ├── matching.ts       ← order matching + position updates
        └── liquidation.ts    ← liquidation checks on price updates
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Install and Run

```bash
git clone https://github.com/yourusername/perps-v1
cd perps-v1
bun install
bun run index.ts
```

Server starts on `http://localhost:3000`

## Authentication

This project uses a simple header-based auth for development. After signin, pass your `userId` in every protected request:

```
x-user-id: 1
```

## API Reference

### Auth

#### Sign Up
```http
POST /signup
Content-Type: application/json

{
  "username": "alice",
  "password": "pass123"
}
```

#### Sign In
```http
POST /signin
Content-Type: application/json

{
  "username": "alice",
  "password": "pass123"
}
```
Returns `userId`. Use this as `x-user-id` header in all future requests.

---

### Wallet

#### Deposit Funds
```http
POST /onramp
x-user-id: 1
Content-Type: application/json

{
  "amount": 1000
}
```

#### Check Balance
```http
GET /equity/available
x-user-id: 1
```

Response:
```json
{
  "available": 2000,
  "locked": 1000,
  "total": 3000
}
```

- `available` — free to use for new positions
- `locked` — tied up in open positions/orders

---

### Orders

#### Place an Order
```http
POST /order
x-user-id: 1
Content-Type: application/json

{
  "market": "SOL",
  "type": "LONG",
  "qty": 5,
  "margin": 100,
  "orderType": "limit",
  "price": 92
}
```

| Field | Values | Description |
|---|---|---|
| `market` | `SOL`, `ETH`, `BTC`, ... | Which asset |
| `type` | `LONG` / `SHORT` | Direction |
| `qty` | number | Number of units |
| `margin` | number | Collateral to lock |
| `orderType` | `limit` / `market` | Limit waits for price, market fills immediately |
| `price` | number | Your price (limit orders) |

#### Cancel an Order
```http
DELETE /order
x-user-id: 1
Content-Type: application/json

{
  "orderId": 13
}
```

#### Get All Orders in a Market
```http
GET /orders/SOL
x-user-id: 1
```

#### Get Open Orders in a Market
```http
GET /orders/open/SOL
x-user-id: 1
```

---

### Positions

#### Open Positions
```http
GET /positions/open/SOL
x-user-id: 1
```

#### Closed Positions
```http
GET /positions/closed/SOL
x-user-id: 1
```

Position object:
```json
{
  "market": "SOL",
  "type": "LONG",
  "qty": 10,
  "margin": 500,
  "averagePrice": 90,
  "liquidationPrice": 80,
  "pnl": 150,
  "isClosed": false
}
```

---

### Fills

#### Get Your Fill History
```http
GET /fills
x-user-id: 1
```

---

### Price Updates (Liquidation Trigger)

Simulates a price feed from an external source (e.g. Binance):

```http
POST /price-update
Content-Type: application/json

{
  "asset": "SOL",
  "price": 75
}
```

Triggers liquidation checks on all open positions for that asset.

---

## How the Matching Engine Works

### Orderbook Structure

```
BIDS (LONGs waiting to buy)     ASKS (SHORTs waiting to sell)
─────────────────────────────   ─────────────────────────────
$92  →  5 units                  $94  →  3 units
$91  →  10 units  ← best bid     $95  →  8 units  ← best ask
$90  →  3 units                  $96  →  12 units
```

### Matching Rules

- **LONG limit at $95** → matches asks at ≤ $95 (cheapest first), remainder goes into bids
- **SHORT limit at $91** → matches bids at ≥ $91 (highest first), remainder goes into asks
- **Market order** → fills at best available price immediately, no price check

### Liquidation Price Formula

```
LONG:  liquidationPrice = averagePrice - (0.2 × margin / qty)
SHORT: liquidationPrice = averagePrice + (0.2 × margin / qty)
```

When market price crosses this level, the position is force-closed. The 20% buffer is the maintenance margin.

### PnL Calculation

```
LONG PnL  = (currentPrice - averagePrice) × qty
SHORT PnL = (averagePrice - currentPrice) × qty
```

---

## Test Scenario (Postman)

Full flow — deposit, match two orders, trigger liquidation:

```
1. POST /onramp          deposit $1000          (x-user-id: 1)
2. POST /order           LONG BTC limit $95000  (x-user-id: 1)
3. POST /order           SHORT BTC market       (x-user-id: 2)  ← matches step 2
4. GET  /fills           see the new trade      (x-user-id: 1)
5. POST /price-update    SOL price → $75        (triggers liquidation)
6. GET  /positions/closed/SOL                   (x-user-id: 1)
```

---

## Roadmap

- [ ] Redis pub/sub for real-time events
- [ ] WebSocket server for live price and fill streaming
- [ ] PostgreSQL persistence for fills and positions
- [ ] Binance WebSocket integration for live price feeds
- [ ] JWT authentication
- [ ] Funding rate calculation
