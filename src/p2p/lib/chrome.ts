function sendChromeMsg(msg: any) {
  chrome.runtime.sendMessage(msg);
}

export function sendJoinSuccessMsg(
  roomName: string,
  participantsCount: number
) {
  sendChromeMsg({
    type: "JOIN_SUCCESS",
    roomName: roomName,
    participantsCount: participantsCount,
  });
}

export function sendHostSuccessMsg(roomId: string) {
  sendChromeMsg({ type: "HOST_SUCCESS", roomId });
}

// TODO:
export function sendPauseMsg() {}

export function sendPlayMsg() {}

export function sendSeekMsg() {}

export function sendNextVideoMsg() {}
