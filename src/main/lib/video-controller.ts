import { PeerMessage, PeerMessageType } from "../../common/sync-messages-types";
import { sendVCMsg } from "./chrome";

export class VideoController {
  _video: HTMLVideoElement;
  constructor(videoElement: HTMLVideoElement) {
    this._video = videoElement;

    this._video.addEventListener("pause", () => this.onPause());
    this._video.addEventListener("play", () => this.onPlay());
    this._video.addEventListener("seek", () => this.onSeek());
    // TODO: listen to incoming msg from message manager
  }

  onPause() {
    sendVCMsg({
      type: PeerMessageType.Pause,
      time: this._video.currentTime,
    });
  }

  onPlay() {
    sendVCMsg({
      type: PeerMessageType.Play,
      time: this._video.currentTime,
    });
  }

  onSeek() {
    sendVCMsg({
      type: PeerMessageType.Seek,
      time: this._video.currentTime,
    });
  }

  onRemoteEvent(msg: PeerMessage) {
    console.log(`[VC] ${msg}`);
    // TODO: pause/play/seek video; ignore if video is already in the same state as described in msg
    switch (msg.type) {
      case PeerMessageType.Pause:
        this._video.pause();
        break;

      case PeerMessageType.Play:
        this._video.play();
        break;

      case PeerMessageType.Seek:
        break;
    }
  }
}
