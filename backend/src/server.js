require("dotenv").config();
const app = require("./app");
const connectDatabase = require("./config/db");

const port = Number(process.env.PORT || 5000);

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }
  await connectDatabase();
  app.listen(port, () => {
    console.log(`ResolveX API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start ResolveX API:", error);
  process.exitCode = 1;
});
