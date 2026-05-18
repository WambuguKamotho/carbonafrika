import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import verificationRoutes from "./routes/verification";

const app = express();
const PORT = process.env.VERIFICATION_PORT || 3004;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "verification-service" }));
app.use("/verifications", verificationRoutes);

app.listen(PORT, () => {
  console.log(`verification-service running on port ${PORT}`);
});
