import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import projectRoutes from "./routes/projects";

const app = express();
const PORT = process.env.PROJECT_PORT || 3002;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "project-service" }));
app.use("/projects", projectRoutes);

app.listen(PORT, () => {
  console.log(`project-service running on port ${PORT}`);
});
