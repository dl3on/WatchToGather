import { Server } from "socket.io";
import { createServer } from "node:http";
import * as express from "express";
import {
  ClientToServerEvents,
  Connection,
  ServerToClientEvents,
} from "./types";
const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
const connections: { [roomId: string]: Connection[] } = {};

connections["329rfh398"] = [
  { hostname: "test.io", ip: "0.0.0.0", action: "host" },
];

io.on("connection", (socket) => {
  console.log(`User connected with socket id ${socket.id}`);

  socket.on("join", (msg) => {
    const { peerId, roomId } = msg;
    console.log(`Peer with id ${peerId} requested to joined Room ${roomId}`);

    if (roomId in connections) {
      socket.emit("response", {
        success: true,
        roomId: roomId,
        body: `Successfully joined Room ${roomId}`,
      });
    } else {
      socket.emit("response", {
        success: false,
        roomId: roomId,
        errMsg: "Room does not exist.",
      });
    }
  });

  socket.on("host", (msg) => {
    const { peerId } = msg;
    console.log(`Peer with id ${peerId} hosting new room.`);
  });
});

export { httpServer, app, connections };
