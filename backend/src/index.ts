// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import ingestRoutes from "./api/routes/ingest.routes";
// import http from "http";
// import { initSocket } from "./realtime/socket";
// import { startPatternWorker } from "./workers/pattern.worker";


// dotenv.config();

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.use("/api", ingestRoutes);

// const server = http.createServer(app);

// initSocket(server);

// server.listen(5000, () => {
//   console.log("Server + Socket running on port 5000");
// });

// startPatternWorker();

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import ingestRoutes from "./api/routes/ingest.routes";
import alertRoutes from "./api/routes/alert.routes"; // ✅ ADD THIS
import http from "http";
import { initSocket } from "./realtime/socket";
import { startPatternWorker } from "./workers/pattern.worker";
import historyRoutes from "./api/routes/history.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", ingestRoutes);
app.use("/api/alerts", alertRoutes); // ✅ ADD THIS
app.use("/api/history", historyRoutes);

const server = http.createServer(app);

initSocket(server);

server.listen(5000, () => {
  console.log("Server + Socket running on port 5000");
});

startPatternWorker();