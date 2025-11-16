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
  RoomInfo,
} from "../common/types.js";

import { randomUUID } from "node:crypto";

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

const connections: { [roomId: string]: RoomInfo } = {};
const peerMap: { [peerId: string]: { roomId?: string; socketId: string } } = {};

io.use((socket, next) => {
  const { peerId } = socket.handshake.query;
  if (!peerId) next(new Error("Missing peerId."));
  socket.data = { peerId };
  next();
});

io.on("connection", (socket) => {
  const { peerId } = socket.data;
  const socketId = socket.id;
  console.log(
    `User with peer id ${peerId} connected with socket id ${socketId}`
  );

  socket.on("disconnect", () => {
    console.log(`Peer ${peerId} has disconnected from the server.`);

    const presentRoomId = peerMap[peerId]?.roomId;
    if (!presentRoomId) return;

    const presentRoom = connections[presentRoomId];
    if (!presentRoom) return;

    const peerList = presentRoom.peers;
    const peer = peerList.find((p) => p.peerId === peerId);
    if (!peer) return;

    const idx = peerList.indexOf(peer);
    peerList.splice(idx, 1);

    // TODO: If is host, assign new host
    if (peerList.length == 0) delete connections[presentRoomId];
  });

  socket.on(EClientToServerEvents.Join, (msg) => {
    const { roomId } = msg;
    console.log(`Peer with id ${peerId} requested to joined Room ${roomId}`);

    if (roomId in connections) {
      const roomInfo = connections[roomId];
      socket.emit(EServerToClientEvents.JoinResponse, {
        type: ResponseType.Join,
        success: true,
        roomId: roomId,
        body: roomInfo,
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
    const roomId = randomUUID();
    const { roomName } = msg;
    console.log(`Peer with id ${peerId} hosting new room: ${roomId}`);
    connections[roomId] = { roomName, peers: [{ peerId, host: true }] };
    peerMap[peerId] = { socketId, roomId };

    socket.emit(EServerToClientEvents.HostResponse, {
      type: ResponseType.Host,
      success: true,
      roomId,
      body: roomId,
    });
  });

  socket.on(EClientToServerEvents.Offer, (msg) => {
    const entries = Object.entries(msg);
    entries.forEach((e) => {
      const targetPeerId = e[0];
      const offer = e[1];

      const targetSocketId = peerMap[targetPeerId]?.socketId;
      if (!targetSocketId) {
        socket.emit(EServerToClientEvents.Error, {
          msg: "Target socket id not found. Target may have disconnected.",
        });
        return;
      }

      io.to(targetSocketId).emit(EServerToClientEvents.OfferRelay, {
        fromPeerId: peerId,
        offer,
      });
    });
  });
});

export { httpServer, app, connections };
