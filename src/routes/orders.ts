// place /cancel/ get order
// there are four type
/* open= sitting in order book,waiting for match
partial=partial filled, rest still waiting
filled=fully matched
cancelled=you cancelled it before it filled*/

import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
export const ordersRouter=Router();
// all order in the market
ordersRouter.get("/order/:marketId",authMiddleware,(req,res)=>{
    const user=res.locals.user;
    const{marketId}=req.params;
    const orders=user.orders.filter((o:any)=>o.market===marketId);
    res.json(orders);

})

//partial ordersin market
ordersRouter.get("/orders/open/:marketId",authMiddleware,(req,res)=>{
    const user=res.locals.user;
    const {marketId}=req.params;
    const openOrders=user.orders.filter(
        (o:any)=>o.market===marketId && (o.status==="open"||o.status==="partial")

    );
    res.json(openOrders);
})