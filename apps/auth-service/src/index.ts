import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth";

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "auth-service" }));
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`auth-service running on port ${PORT}`);
});
