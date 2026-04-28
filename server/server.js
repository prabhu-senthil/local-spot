import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { connectDB } from "./src/config/db.js";

import healthRoutes from "./src/routes/health.routes.js";
import authRoutes from "./src/routes/authroutes.js";
import venuesRoutes from "./src/routes/venues.routes.js";
import reviewsRoutes from "./src/routes/reviews.routes.js";
import notificationsRoutes from "./src/routes/notifications.routes.js";
import analyticsRoutes from "./src/routes/analytics.routes.js";
import crowdRoutes from "./src/routes/crowd.routes.js";
import uploadRoutes from "./src/routes/upload.routes.js";

import errorHandler from "./src/middleware/errorHandler.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api", healthRoutes);
// app.post('/api/auth/register', (req, res) => {
//   res.json({ message: 'User created' });
// });
app.use("/api/auth", authRoutes);
app.use("/api/venues", venuesRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/crowd", crowdRoutes);
app.use("/api/upload", uploadRoutes);

app.use(errorHandler);

await connectDB();

app.listen(PORT, () => {
  console.log(`Backend started on port ${PORT}`);
});

export default app;

