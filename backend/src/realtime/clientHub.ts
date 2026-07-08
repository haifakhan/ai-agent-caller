import type { CallSessionState, ClientEvent } from "@accesscall/shared";
import type { WebSocket } from "ws";

export class ClientHub {
  private readonly clientsBySession = new Map<string, Set<WebSocket>>();

  subscribe(sessionId: string, socket: WebSocket): void {
    const sockets = this.clientsBySession.get(sessionId) ?? new Set<WebSocket>();
    sockets.add(socket);
    this.clientsBySession.set(sessionId, sockets);

    socket.on("close", () => {
      sockets.delete(socket);
      if (!sockets.size) {
        this.clientsBySession.delete(sessionId);
      }
    });
  }

  broadcast(sessionId: string, event: ClientEvent): void {
    const sockets = this.clientsBySession.get(sessionId);
    if (!sockets?.size) {
      return;
    }

    const payload = JSON.stringify(event);
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.send(payload);
      }
    }
  }

  broadcastState(session: CallSessionState): void {
    this.broadcast(session.id, {
      type: "session.state",
      session,
    });
  }
}
