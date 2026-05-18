// order matching
import type {User,PositionType,OrderType,Order}from "../types.ts";
import {orderbooks,fills,getUserById,getNextOrderId,getNextFillId} from "../store.ts";

function calcLiquidationPrice(type:PositionType,avgPrice:number,margin:number,qty:number){
    const  buffer=(0.2*margin)/qty;
    return type==="LONG" ? avgPrice-buffer:avgPrice+buffer;
}

//update a user position
function updatePosition(
    user:User,
    market:string,
    type: PositionType,
    fillQty:number,
    fillPrice:number,
    marginForFill:number
){
    const existing=user.positions.find(p=>p.market===market && !p.isClosed);
    if(!existing){
        user.positions.push({
            market,type,qty:fillQty,
            margin:marginForFill,
            averagePrice:fillPrice,
            liquidationPrice:calcLiquidationPrice(type,fillPrice,marginForFill,fillQty),
            pnl:0,
            isClosed:false,
        });
        return;
    }
    if(existing.type===type){
        const totalQty=existing.qty+fillQty;
        existing.averagePrice=(existing.averagePrice*existing.qty+fillPrice*fillQty)/totalQty;
        existing.qty=totalQty;
        existing.margin += marginForFill;
        existing.liquidationPrice=calcLiquidationPrice(type,existing.averagePrice,existing.margin,totalQty);
        return;
    }
    // closing the position
    const pnl=existing.type==="LONG"
    ?(fillPrice-existing.averagePrice)*Math.min(fillQty,existing.qty)
    :(existing.averagePrice-fillPrice)*Math.min(fillQty,existing.qty);
    if(fillQty>=existing.qty){
        // full clsed
        user.collateral.locked -= existing.margin;
        user.collateral.available += existing.margin+pnl;
        existing.isClosed=true;
        existing.closedAt=new Date();
        existing.closePrice=fillPrice;
        existing.pnl=pnl;

        const extraQty=fillQty-existing.qty;
        if(extraQty>0){
            const extraMargin=(extraQty/fillQty)*marginForFill;
            user.positions.push({
                market,type,qty:extraQty,
                margin:extraMargin,
                averagePrice:fillPrice,
                liquidationPrice:calcLiquidationPrice(type,fillPrice,extraMargin,extraQty),
                pnl:0,
                isClosed:false,
            });
        }else{
            user.collateral.locked -= marginForFill;
            user.collateral.available += marginForFill;
        }
    }else{
        //partial closed
        const ratio=fillQty/existing.qty;
        const releasedMargin=ratio*existing.margin;
        user.collateral.locked -=releasedMargin+marginForFill;
        user.collateral.available +=releasedMargin+marginForFill+pnl;
        existing.qty-=fillQty;
        existing.margin -=releasedMargin;
        existing.liquidationPrice=calcLiquidationPrice(existing.type,existing.averagePrice,existing.margin,existing.qty);
        existing.pnl +=pnl;
    }
}

// place order

export function placeOrder(
    userId:number,
    market:string,
    type:PositionType,
    qty:number,
    margin:number,
    orderType:OrderType,
    price:number,
){
    const user=getUserById(userId);
    if(!user) return {success:false,message:"User not found"};
    if(!orderbooks[market]){
        if(orderType ==="market")return {success:false,message:"Market not found"};
        orderbooks[market]={bids:{},asks:{},lastTradedPrice:price,indexPrice:price};
    }
    if(user.collateral.available< margin){
        return {success:false,message:"Insufficient collateral"};
    }
    //margin lock 
    user.collateral.available -=margin;
    user.collateral.locked += margin;
    const orderId=getNextOrderId();
    const order:Order={
        orderId,market,type,qty,margin,orderType,price,status:"open",filledQty:0,createdAt:new Date(),
    };
    user.orders.push(order);
    const ob = orderbooks[market];
    const marginPerUnit=margin/qty;
    let remainingQty=qty;
    if(type==="LONG"){
        // match against asks (cheapest first)
        const askPrices = Object.keys(ob.asks)
            .map(Number)
            .filter(p => orderType === "market" || p <= price)
            .sort((a, b) => a - b);

        for(const askPrice of askPrices){
            if(remainingQty === 0) break;
            const level = ob.asks[String(askPrice)]!;
            for(let i = 0; i < level.openOrders.length && remainingQty > 0; i++){
                const makerEntry = level.openOrders[i]!;
                const fillQty = Math.min(remainingQty, makerEntry.qty - makerEntry.filledQty);
                if(fillQty <= 0) continue;
                const makerUser = getUserById(makerEntry.userId)!;
                const makerOrder = makerUser.orders.find(o => o.orderId === makerEntry.orderId)!;
                const makerMarginForFill = (makerOrder.margin / makerOrder.qty) * fillQty;
                fills.push({
                    fillId: getNextFillId(),
                    maker: makerEntry.userId, taker: userId,
                    market, qty: fillQty, price: askPrice,
                    long: userId, short: makerEntry.userId,
                    timestamp: new Date(),
                });
                updatePosition(user, market, "LONG", fillQty, askPrice, marginPerUnit * fillQty);
                updatePosition(makerUser, market, "SHORT", fillQty, askPrice, makerMarginForFill);
                makerEntry.filledQty += fillQty;
                makerOrder.filledQty += fillQty;
                makerOrder.status = makerOrder.filledQty >= makerOrder.qty ? "filled" : "partial";
                level.availableQty -= fillQty;
                remainingQty -= fillQty;
                order.filledQty += fillQty;
                ob.lastTradedPrice = askPrice;
                if(makerEntry.filledQty >= makerEntry.qty){
                    level.openOrders.splice(i--, 1);
                }
            }
            if(level.openOrders.length === 0) delete ob.asks[String(askPrice)];
        }

        if(remainingQty > 0 && orderType === "limit"){
            const key = String(price);
            if(!ob.bids[key]) ob.bids[key] = { availableQty: 0, openOrders: [] };
            ob.bids[key]!.availableQty += remainingQty;
            ob.bids[key]!.openOrders.push({ userId, qty: remainingQty, filledQty: 0, orderId, createdAt: new Date() });
        }

    } else {
        // SHORT — match against bids (highest first)
        const bidPrices = Object.keys(ob.bids)
            .map(Number)
            .filter(p => orderType === "market" || p >= price)
            .sort((a, b) => b - a);

        for(const bidPrice of bidPrices){
            if(remainingQty === 0) break;
            const level = ob.bids[String(bidPrice)]!;
            for(let i = 0; i < level.openOrders.length && remainingQty > 0; i++){
                const makerEntry = level.openOrders[i]!;
                const fillQty = Math.min(remainingQty, makerEntry.qty - makerEntry.filledQty);
                if(fillQty <= 0) continue;
                const makerUser = getUserById(makerEntry.userId)!;
                const makerOrder = makerUser.orders.find(o => o.orderId === makerEntry.orderId)!;
                const makerMarginForFill = (makerOrder.margin / makerOrder.qty) * fillQty;
                fills.push({
                    fillId: getNextFillId(),
                    maker: makerEntry.userId, taker: userId,
                    market, qty: fillQty, price: bidPrice,
                    long: makerEntry.userId, short: userId,
                    timestamp: new Date(),
                });
                updatePosition(user, market, "SHORT", fillQty, bidPrice, marginPerUnit * fillQty);
                updatePosition(makerUser, market, "LONG", fillQty, bidPrice, makerMarginForFill);
                makerEntry.filledQty += fillQty;
                makerOrder.filledQty += fillQty;
                makerOrder.status = makerOrder.filledQty >= makerOrder.qty ? "filled" : "partial";
                level.availableQty -= fillQty;
                remainingQty -= fillQty;
                order.filledQty += fillQty;
                ob.lastTradedPrice = bidPrice;
                if(makerEntry.filledQty >= makerEntry.qty){
                    level.openOrders.splice(i--, 1);
                }
            }
            if(level.openOrders.length === 0) delete ob.bids[String(bidPrice)];
        }

        if(remainingQty > 0 && orderType === "limit"){
            const key = String(price);
            if(!ob.asks[key]) ob.asks[key] = { availableQty: 0, openOrders: [] };
            ob.asks[key]!.availableQty += remainingQty;
            ob.asks[key]!.openOrders.push({ userId, qty: remainingQty, filledQty: 0, orderId, createdAt: new Date() });
        }
    }

    order.status = order.filledQty === 0 ? "open" : order.filledQty >= qty ? "filled" : "partial";
    return { success: true, orderId, filledQty: order.filledQty };
}
    // cancel order
    export function cancelOrder(userId:number,orderId:number){
        const user=getUserById(userId);
        if(!user) return {success:false,message:"User not found"};
        const order=user.orders.find(o=>o.orderId===orderId);
        if(!order) return {success:false,message:"Order not Found"};
        if(order.status !== "open" && order.status !=="partial"){
            return {success:false,message:"Order can not be cancelled"};
        }
        const ob =orderbooks[order.market];
        if(ob){
            const side=order.type==="LONG"?ob.bids:ob.asks;
            const level = side[String(order.price)];
            if(level){
                const idx=level.openOrders.findIndex(o=>o.orderId===orderId);
                if(idx!== -1){
                    const unfilled = order.qty-order.filledQty;
                    level.availableQty -= unfilled;
                    level.openOrders.splice(idx,1);
                    if(level.openOrders.length===0) delete side[String(order.price)];
                }
            }
        }
        // return unfilled margin
        const unfilledMargin= ((order.qty-order.filledQty)/order.qty)*order.margin;
        user.collateral.locked -= unfilledMargin;
        user.collateral.available += unfilledMargin;
        order.status="cancelled";
        return{success:true,message:"order Cancelled"};
    }
