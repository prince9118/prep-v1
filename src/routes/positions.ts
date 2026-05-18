// positions
import {Router} from "express";
import { authMiddleware } from "../middleware/auth.ts";

export const positionRouter=Router();
//openPosition
positionRouter.get("/positions/open/:marketId",authMiddleware,(req,res)=>{
 const user=res.locals.user;
 const {marketId}=req.params;
 const openPostions=user.positions.filter(
    (p:any)=>p.market === marketId && !p.isClosed
 );
 res.json(openPostions);
});

//closed positon
positionRouter.get("/positions/closed/:marketId",authMiddleware,(req,res)=>{
   const user=res.locals.user;
   const {marketId}=req.params;
   const closedPosition=user.positions.filter(
    (p:any)=>p.market === marketId && p.isClosed
   );
   res.json(closedPosition);
})


