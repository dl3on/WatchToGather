import { Response } from "../../../common/types.js";
import { ResponseType } from "../../../common/types.js";
import { sendJoinSuccessMsg, sendHostSuccessMsg } from "../chrome.js";

export function onJoinResponse(
  res: Response<ResponseType.Join>,
  verbose: boolean
) {
  if (verbose) {
    if (res.success) {
      console.log(
        `[SignalManager] Received join response from server: ${JSON.stringify(
          res.body,
          null,
          2
        )}`
      );
    } else {
      console.log(
        `[SignalManager] Failed to join room ${res.roomId}:`,
        res.errMsg
      );
    }
  }

  if (!res.success) return;

  // TODO: wait until P2P established
  sendJoinSuccessMsg(res.body.roomName, res.body.peers.length);
}

export function onHostResponse(
  res: Response<ResponseType.Host>,
  verbose: boolean
) {
  if (verbose) {
    if (res.success) {
      console.log(`[SignalManager] Successfully created Room ${res.roomId}`);
    } else {
      console.log(`[SignalManager] Failed to create room:`, res.errMsg);
    }
  }

  if (!res.success) return;

  sendHostSuccessMsg(res.roomId);
}

export function onConnect(
  peerId: string,
  socketId: string | undefined,
  verbose: boolean
) {
  if (verbose && socketId) {
    console.log(
      `[SignalManager] Connected to signalling server.\nPeer ID: ${peerId}\nSocket ID: ${socketId}`
    );
  } else if (!socketId) {
    throw new Error("[SignalManager] Socket not defined.");
  }
}
