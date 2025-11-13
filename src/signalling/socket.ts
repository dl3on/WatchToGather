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
const socketMap: { [peerId: string]: string } = {};

io.use((socket, next) => {
  const { peerId } = socket.handshake.query;
  if (!peerId) next(new Error("Missing peerId."));
  socket.data = { peerId };
  next();
});

io.on("connection", (socket) => {
  const { peerId } = socket.data;
  console.log(
    `User with peer id ${peerId} connected with socket id ${socket.id}`
  );

  socket.on("disconnect", () => {
    console.log(`Peer ${peerId} has disconnected from the server.`);

    const presentRoomId = socketMap[peerId];
    if (!presentRoomId) return;

    const presentRoom = connections[presentRoomId];
    if (!presentRoom) return;

    const peer = presentRoom.find((p) => p.peerId === peerId);
    if (!peer) return;

    const idx = presentRoom.indexOf(peer);
    presentRoom.splice(idx, 1);

    if (presentRoom.length == 0) delete connections[presentRoomId];
  });

  socket.on(EClientToServerEvents.Join, (msg) => {
    const { roomId } = msg;
    console.log(`Peer with id ${peerId} requested to joined Room ${roomId}`);

    if (roomId in connections) {
      const peers = connections[roomId];
      socket.emit(EServerToClientEvents.JoinResponse, {
        type: ResponseType.Join,
        success: true,
        roomId: roomId,
        body: peers,
      });
    } else {
      socket.emit(EServerToClientEvents.JoinResponse, {
        success: false,
        roomId: roomId,
        errMsg: "Room does not exist.",
      });
    }
  });

  socket.on(EClientToServerEvents.Host, () => {
    const roomId = randomUUID();
    console.log(`Peer with id ${peerId} hosting new room: ${roomId}`);
    connections[roomId] = [{ peerId, host: true }];
    socketMap[peerId] = roomId;

    socket.emit(EServerToClientEvents.HostResponse, {
      type: ResponseType.Host,
      success: true,
      roomId,
      body: roomId,
    });
  });
});

export { httpServer, app, connections };
