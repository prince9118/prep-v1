import type { NumberLiteralType } from "typescript";

// all TypeScipt types
export type OrderType="limit"|"market";
export type PositionType="LONG" | "SHORT";
export type OrderStatus="open"| "filled"|"cancelled"|"partial";

export interface Collateral{
    available:number;
    locked:number;
}

export interface Position {
    market:string;
    type:PositionType;
    qty:number;
    margin:number;
    liquidationPrice:number;
    averagePrice:number;
    pnl:number;
    isClosed:boolean;
    closedAt?:Date;
    closedPrice?:number;
}
export interface Order{
    orderId:number;
    market:string;
    type:PositionType;
    qty:number;
    margin:number;
    orderType:OrderType;
    price:number;
    status:OrderStatus;
    filledQty: number;
    createdAt:Date;
}
export interface User{
 userId:Number;
 username:string;
 password:string;
 collateral:Collateral;
 positions:Position[];
 orders:Order[];
}

export interface OpenOrder{
    userId:number;
    qty:number;
    filledQty:number;
    orderId:number;
    createAt:Date;
}

export interface Pricelevel{
    aavailableQty:number;
    openOrder:OpenOrder[];
}
export interface Orderbook{
    bids:Record<string,Pricelevel>;
    asks:Record<string,Pricelevel>;
    lastTradedPrice:number;
    indexPrice:number;
}

export interface Fill{
    fillId:number;
    maker:number;
    taker:number;
    market:string;
    qty:number;
    price:number;
    long:number;
    short:number;
    timestamp:Date;
}

