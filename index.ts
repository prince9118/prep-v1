import express from "express";
import { authRouter } from "./src/routes/auth.ts";
import { walletRouter } from "./src/routes/wallet.ts";
import { positionRouter } from "./src/routes/positions.ts";
import { ordersRouter } from "./src/routes/orders.ts";
import { fillsRouter } from "./src/routes/fills.ts";
import { liquidationChecks } from "./src/engine/liquidation.ts";
const app = express();
app.use(express.json());

app.use(authRouter);
app.use(walletRouter);
app.use(positionRouter);
app.use(ordersRouter);
app.use(fillsRouter);

app.post("/price-update",(req,res)=>{
  const {asset,price}=req.body;
  if(!asset||!price){
    res.status(400).json({
      message:"asset and prie required"
    });
    return;
  }
  liquidationChecks(asset,Number(price));
  res.json({message:`price updates: ${asset}=$${price}`});
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
