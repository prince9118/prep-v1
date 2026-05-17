// positions
import {Router} from "express";
import { authMiddleware } from "../middleware/auth";

export const positionRouter=Router();
//openPosition
positionRouter.get("/position/open/:marketId",authMiddleware,(req,res)=>{
 const user=res.locals.user;
 const {marketId}=req.params;
 const openPostions=user.positions.filter(
    (p:any)=>p.market && !p.closed
 );
 res.json(openPostions);
});

//closed positon
positionRouter.get("/position/closed/:marketId",authMiddleware,(req,res)=>{
   const user=res.locals.user;
   const {marketId}=req.params;
   const closedPosition=user.position.filter(
    (p:any)=>p.market === marketId && p.isclosed
   );
   res.json(closedPosition);
})


