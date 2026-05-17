// sign up and sing in 
import { Router } from "express";
import { users, getUserByUsername, getNextUserId } from "../store.ts";

export const authRouter = Router();

authRouter.post("/signup", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ message: "Username and password required" });
    return;
  }

  if (getUserByUsername(username)) {
    res.status(400).json({ message: "Username already taken" });
    return;
  }

  const newUser = {
    userId: getNextUserId(),
    username,
    password: String(password),
    collateral: { available: 0, locked: 0 },
    positions: [],
    orders: [],
  };

  users.push(newUser);
  res.json({ userId: newUser.userId, message: "Signup successful" });
});

authRouter.post("/signin", (req, res) => {
  const { username, password } = req.body;

  const user = getUserByUsername(username);
  if (!user || user.password !== String(password)) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  res.json({ userId: user.userId, message: "Signin successful" });
});
