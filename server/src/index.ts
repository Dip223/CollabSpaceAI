import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import serverRoutes from "./routes/serverRoutes";

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/user",
  userRoutes
);

app.use(
  "/api/server",
  serverRoutes
);

app.get("/", (req, res) => {

  res.send(
    "CollabSpace API Running"
  );

});

const PORT =
process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `Server running on ${PORT}`
  );

});