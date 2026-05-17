// on ramp , equity
import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
export const walletRouter=Router();
walletRouter.post("/onramp",authMiddleware,(req,res)=>{
    const {amount}=req.body;
    const user=res.locals.user;
    if(!amount||amount<=0){
        return res.status(400).json({
            message:"Invalid amount",
        });
    }
    user.collateral.available += Number(amount);
    res.json({
        message:"Funds added",
        collateral:user.collateral,
    });
});

walletRouter.get("/equity/available",authMiddleware,(req,res)=>{
    const user=res.locals.user;
    res.json({
        available:user.collateral.available,
        locked:user.collateral.locked,
        total:user.collateral.available+user.collateral.locked,
    });
});