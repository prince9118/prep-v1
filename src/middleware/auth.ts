// check userID is valid on every protected route
import type{Request, Response,NextFunction} from "express";
import { getUserById } from "../store.ts";
export function authMiddleware(req:Request,res:Response,next:NextFunction){
    const userId=Number(req.headers["x-user-id"]);
    if(!userId){
        res.status(400).json({
            success:false,
            message:"Missing x-user-id header"
        });
        return;
    }
    const user=getUserById(userId);
    if(!user){
        res.status(401).json({
            success:false,
            message:"user not found",
        })
        return;
    }
    res.locals.user=user;
    next();
}