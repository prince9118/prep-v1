// place /cancel/ get order
// there are four type
/* open= sitting in order book,waiting for match
partial=partial filled, rest still waiting
filled=fully matched
cancelled=you cancelled it before it filled*/

import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { placeOrder,cancelOrder } from "../engine/matching";
export const ordersRouter=Router();
// open orders in market (specific route first — Express matches top to bottom)
ordersRouter.get("/orders/open/:marketId",authMiddleware,(req,res)=>{
    const user=res.locals.user;
    const {marketId}=req.params;
    const openOrders=user.orders.filter(
        (o:any)=>o.market===marketId && (o.status==="open"||o.status==="partial")

    );
    res.json(openOrders);
})

// all orders in a market (generic route after specific one)
ordersRouter.get("/orders/:marketId",authMiddleware,(req,res)=>{
    const user=res.locals.user;
    const{marketId}=req.params;
    const orders=user.orders.filter((o:any)=>o.market===marketId);
    res.json(orders);
})

// place order
ordersRouter.post("/order",authMiddleware,(req,res)=>{
    const user=res.locals.user;
    const {market,type,qty,margin,orderType,price}=req.body;
    if(!market || !type|| !qty || !margin || !orderType || !price){
        res.status(400).json({
            message:"missing required fields"
        });
        return;
    }
    if(orderType !== "limit" && orderType !== "market"){
        res.status(400).json({
            message:"orderType must be  limit or market"
        });
        return;
    }
    const result = placeOrder(
        user.userId,
        market,
        type,
        Number(qty),
        Number(margin),
        orderType,
        Number(price)
    );
    if(!result?.success){
        res.status(400).json(result)
        return;
    }
    res.json(result);
});

//cancel order

ordersRouter.delete("/order",authMiddleware,(req,res)=>{
    const user=res.locals.user;
    const{orderId}=req.body;
    if(!orderId){
        res.status(400).json({message:"orderId requied"});
        return;
    }
    const result=cancelOrder(user.userId,Number(orderId));
    if(!result.success){
        res.status(400).json(result);
        return;
    }
    res.json(result);
});