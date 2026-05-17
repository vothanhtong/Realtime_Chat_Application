import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";

dotenv.config({ path: "./.env" });

mongoose.connect(process.env.MONGODB_CONNECTIONSTRING).then(async () => {
  const users = await User.find({}).select("username displayName statusVisible").limit(5);
  console.log("Users:", users);
  process.exit(0);
});
