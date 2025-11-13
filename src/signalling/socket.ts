import { Server } from "socket.io";
import { createServer } from "node:http";
import express from "express";
import {
  ClientToServerEvents,
  PeerData,
  EClientToServerEvents,
  EServerToClientEvents,
  ServerToClientEvents,
  ResponseType,
} from "../common/types";

import { randomUUID } from "node:crypto";

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

const connections: { [roomId: string]: PeerData[] } = {};
io.on("connection", (socket) => {
  console.log(`User connected with socket id ${socket.id}`);

  socket.on("disconnect", () =>
    console.log(`Socket with id ${socket.id} has disconnected from the server.`)
  );

  socket.on(EClientToServerEvents.Join, (msg) => {
    const { peerId, roomId } = msg;
    console.log(`Peer with id ${peerId} requested to joined Room ${roomId}`);

    if (roomId in connections) {
      const peers = connections[roomId];
      socket.emit(EServerToClientEvents.JoinResponse, {
        type: ResponseType.Join,
        success: true,
        roomId: roomId,
        body: peers.map((p) => {
          const { socketId, ...peer } = p;
          return peer;
        }),
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
    const roomId = randomUUID();
    console.log(`Peer with id ${peerId} hosting new room: ${roomId}`);
    connections[roomId] = [{ peerId, host: true, socketId: socket.id }];

    socket.emit(EServerToClientEvents.HostResponse, {
      type: ResponseType.Host,
      success: true,
      roomId,
      body: roomId,
    });
  });
});

export { httpServer, app, connections };
