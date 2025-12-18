import express from "express";
import mongoose from "mongoose";
import router from "./auth";
import { mongoUri, port } from "./config";

const app = express();

app.use(express.json());
app.use("/auth", router);

async function main() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error(err);
  }
}

main();
