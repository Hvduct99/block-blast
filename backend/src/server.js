require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "block-blast-backend",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/leaderboard", (req, res) => {
  res.json([
    { id: 1, name: "Player_One", score: 1280 },
    { id: 2, name: "Player_Two", score: 1140 },
    { id: 3, name: "Player_Three", score: 930 },
  ]);
});

app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`);
});
