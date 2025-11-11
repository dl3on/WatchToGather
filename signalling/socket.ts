import { Server } from "socket.io";
import { createServer } from "node:http";
import express from "express";
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer);

io.on("connection", (socket) => {
  console.log("A user connected!");
});

export { httpServer, app };
