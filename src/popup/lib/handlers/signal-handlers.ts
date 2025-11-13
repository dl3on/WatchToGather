import { Response } from "../../../common/types";
import { ResponseType } from "../../../common/types";

export function onJoinResponse(
  res: Response<ResponseType.Join>,
  verbose: boolean
) {
  if (verbose) {
    if (res.success) {
      console.log(
        `Received response from server: ${JSON.stringify(res.body, null, 2)}`
      );
    } else {
      console.log(`Failed to join room ${res.roomId}:`, res.errMsg);
    }
  }
}

export function onHostResponse(
  res: Response<ResponseType.Host>,
  verbose: boolean
) {
  if (verbose) {
    if (res.success) {
      console.log(`Successfully created Room ${res.roomId}`);
    } else {
      console.log(`Failed to create room:`, res.errMsg);
    }
  }
}

export function onConnect(socketId: string | undefined, verbose: boolean) {
  if (verbose && socketId) {
    console.log(`Connected to signalling server.\nSocket ID: ${socketId}`);
  } else if (!socketId) {
    throw new Error("Socket not defined.");
  }
}
