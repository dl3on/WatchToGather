import { PeerMessage, PeerMessageType } from "../../common/sync-messages-types";
import { sendVCMsg } from "./chrome";

export class VideoController {
  private _ignoreSeekCount = 0;
  _video: HTMLVideoElement;
  constructor(videoElement: HTMLVideoElement) {
    this._video = videoElement;

    this._video.addEventListener("pause", () => this.onPause());
    this._video.addEventListener("play", () => this.onPlay());
    this._video.addEventListener("seeked", () => this.onSeek());
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
    if (this._ignoreSeekCount > 0) return;

    sendVCMsg({
      type: PeerMessageType.Seek,
      time: this._video.currentTime,
    });
  }

  onRemoteEvent(msg: PeerMessage) {
    // TODO: pause/play/seek video; ignore if video is already in the same state as described in msg
    // Current observations: pause&play action is being echoed by other peer so sender also receives the same msg w/ diff mid.
    // its fine for now because video.pause and video.play has no effect hence no further messages are echoed.
    switch (msg.type) {
      case PeerMessageType.Pause:
        console.log("[VC] PAUSE");
        this._video.pause();
        break;

      case PeerMessageType.Play:
        console.log("[VC] PLAY");
        this._video.play();
        break;

      case PeerMessageType.Seek:
        if (Math.abs(this._video.currentTime - msg.time) < 0.3) return;

        console.log("[VC] SEEK");
        this._ignoreSeekCount++;
        this._video.currentTime = msg.time;

        this._video.addEventListener(
          "seeked",
          () => {
            this._ignoreSeekCount--;
          },
          { once: true }
        );
        break;
    }
  }
}
