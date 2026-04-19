import express from "express";
import { calculateHandler } from "./src/calculate.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

// Basic health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "Trust Service is running" });
});

// Calculate endpoint
app.post("/calculate", calculateHandler);

app.listen(PORT, () => {
  console.log(`Trust Service listening on port ${PORT}`);
});

export default app; // export for testing if needed
