
// fills
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.ts";
import { fills } from "../store";
export const fillsRouter=Router();

fillsRouter.get("/fills",authMiddleware,(req,res)=>{
 const user=res.locals.user;
 const userFills=fills.filter(
    (f)=>f.long===user.userId ||f.short===user.userId
 );
 res.json(userFills);
})