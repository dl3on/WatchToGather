import { Server } from "socket.io";
import { createServer } from "node:http";
import express from "express";
import { JoinMessage } from "./types";
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer);

io.on("connection", (socket) => {
  const peerId = socket.id;
  console.log("A user connected!");

  socket.on("join", (msg: JoinMessage) => {
    const { peerId, roomId } = msg;
    console.log(`Peer with id ${peerId} requested to joined Room ${roomId}`);
    socket.emit("response", "hello");
  });
});

export { httpServer, app };
