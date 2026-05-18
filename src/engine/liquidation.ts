// liquidation
import {users} from "../store.ts";
import type { Position, User } from "../types.ts";

function calculatePnl(position:Position, currentPrice:number):number{
    if(position.type==="LONG"){
        return (currentPrice-position.averagePrice)*position.qty;
    }else{
        return (position.averagePrice-currentPrice)*position.qty;
    }
}
function liquidationPosition(user:User, position:Position,currentPrice:number){
    const pnl=calculatePnl(position,currentPrice);

    const remainingMargin=Math.max(0,position.margin+pnl);
    user.collateral.locked-= position.margin;
    user.collateral.available += remainingMargin;

    position.isClosed =true;
    position.closedAt = new Date();
    position.closePrice =currentPrice;
    position.pnl=pnl;
    console.log(`Liquidated: ${user.username} ${position.type} ${position.market}`+`qty=${position.qty} at $${currentPrice} | Pnl : ${pnl.toFixed(2)}`);

}
export function liquidationChecks(assets:string,price:number){
    for(const user of users){
        for(const position of user.positions){
            if(position.market !== assets || position.isClosed)continue;
            const shoulfLiquidate=position.type ==="LONG"?price <=position.liquidationPrice:price>=position.liquidationPrice;
            if(shoulfLiquidate){
                liquidationPosition(user,position,price);
            }else{
                position.pnl= calculatePnl(position,price);
            }
        }
    }
}


