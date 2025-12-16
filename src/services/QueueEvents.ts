import { EventEmitter } from "events";

// Event emitter for queue status changes - allows UI to refresh when assets change
export const queueEvents = new EventEmitter();

export type QueueEventType = "changed" | "assetStatusChanged" | "retryAll";

export function emitQueueChanged() {
  queueEvents.emit("changed");
}
export function emitRetryAll() {
  queueEvents.emit("retryAll");
}
