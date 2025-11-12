import { Server } from "socket.io";
import { createServer } from "node:http";
import express from "express";
import {
  ClientToServerEvents,
  Connection,
  EClientToServerEvents,
  EServerToClientEvents,
  ServerToClientEvents,
} from "../common/types";
const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
const connections: { [roomId: string]: Connection[] } = {};

connections["329rfh398"] = [
  { hostname: "test.io", ip: "0.0.0.0", action: "host" },
];

io.on("connection", (socket) => {
  console.log(`User connected with socket id ${socket.id}`);

  socket.on("disconnect", () =>
    console.log(`Socket with id ${socket.id} has disconnected from the server.`)
  );

  socket.on(EClientToServerEvents.Join, (msg) => {
    const { peerId, roomId } = msg;
    console.log(`Peer with id ${peerId} requested to joined Room ${roomId}`);

    if (roomId in connections) {
      socket.emit(EServerToClientEvents.JoinResponse, {
        success: true,
        roomId: roomId,
        body: `Successfully joined Room ${roomId}`,
      });
    } else {
      socket.emit(EServerToClientEvents.JoinResponse, {
        success: false,
        roomId: roomId,
        errMsg: "Room does not exist.",
      });
    }
  });

  socket.on(EClientToServerEvents.Host, (msg) => {
    const { peerId } = msg;
    console.log(`Peer with id ${peerId} hosting new room.`);
  });
});

export { httpServer, app, connections };
