// in memory data(users,orderbooks , fills )
import type { User, Orderbook, Fill } from "./types.ts";

export const users: User[] = [
  {
    userId: 1,
    username: "harkirat",
    password: "123123",
    collateral: { available: 2000, locked: 1000 },
    positions: [
      { market: "SOL", type: "LONG", qty: 10, margin: 500, liquidationPrice: 80, averagePrice: 90, pnl: 0, isClosed: false },
      { market: "ETH", type: "SHORT", qty: 1, margin: 500, liquidationPrice: 2000, averagePrice: 1900, pnl: 0, isClosed: false },
    ],
    orders: [
      { orderId: 1, market: "SOL", type: "LONG", qty: 10, margin: 500, orderType: "limit", price: 90, status: "filled", filledQty: 10, createdAt: new Date() },
      { orderId: 2, market: "ETH", type: "SHORT", qty: 1, margin: 500, orderType: "limit", price: 1900, status: "filled", filledQty: 1, createdAt: new Date() },
    ],
  },
  {
    userId: 2,
    username: "raman",
    password: "123123",
    collateral: { available: 2000, locked: 2000 },
    positions: [
      { market: "SOL", type: "SHORT", qty: 10, margin: 1000, liquidationPrice: 100, averagePrice: 90, pnl: 200, isClosed: false },
      { market: "ETH", type: "LONG", qty: 1, margin: 1000, liquidationPrice: 1700, averagePrice: 1900, pnl: -100, isClosed: false },
    ],
    orders: [
      { orderId: 10, market: "SOL", type: "SHORT", qty: 10, margin: 500, orderType: "market", price: 90, status: "filled", filledQty: 10, createdAt: new Date() },
      { orderId: 11, market: "ETH", type: "LONG", qty: 1, margin: 500, orderType: "market", price: 1900, status: "filled", filledQty: 1, createdAt: new Date() },
    ],
  },
];

export const orderbooks: Record<string, Orderbook> = {
  SOL: { bids: {}, asks: {}, lastTradedPrice: 90, indexPrice: 90.01 },
  ETH: { bids: {}, asks: {}, lastTradedPrice: 1900, indexPrice: 1899.9 },
};

export const fills: Fill[] = [
  { fillId: 1, maker: 1, taker: 2, market: "SOL", qty: 10, price: 90, long: 1, short: 2, timestamp: new Date() },
  { fillId: 2, maker: 1, taker: 2, market: "ETH", qty: 1, price: 1900, long: 2, short: 1, timestamp: new Date() },
];


let nextOrderId = 13;
let nextFillId = 3;
let nextUserId = 3;

export const getNextOrderId = () => nextOrderId++;
export const getNextFillId = () => nextFillId++;
export const getNextUserId = () => nextUserId++;


export const getUserById = (id: number) => users.find(u => u.userId === id);
export const getUserByUsername = (name: string) => users.find(u => u.username === name);
