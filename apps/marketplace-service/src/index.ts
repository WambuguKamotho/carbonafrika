import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import marketplaceRoutes from "./routes/marketplace";

const app = express();
const PORT = process.env.MARKETPLACE_PORT || 3003;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "marketplace-service" }));
app.use("/marketplace", marketplaceRoutes);

app.listen(PORT, () => {
  console.log(`marketplace-service running on port ${PORT}`);
});
