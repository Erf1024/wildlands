
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("Wildlands multiplayer server is online!");
    }

    if (url.pathname !== "/ws") {
      return new Response(
        "Wildlands Multiplayer Server",
        { status: 200 }
      );
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("WebSocket connection required.", {
        status: 426
      });
    }

    // Everyone currently joins the same public world.
    const id = env.ROOM.idFromName("wildlands-public-world");
    const room = env.ROOM.get(id);

    return room.fetch(request);
  }
};

export class WildlandsRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.players = new Map();
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const player = {
      id: crypto.randomUUID(),
      name: "Survivor",
      x: 0,
      y: 1.7,
      z: 0,
      yaw: 0
    };

    server.accept();
    this.players.set(server, player);

    server.addEventListener("message", event => {
      try {
        const message = JSON.parse(event.data);

        if (message.type !== "state") return;

        const current = this.players.get(server);
        if (!current) return;

        if (typeof message.name === "string") {
          current.name = message.name
            .replace(/[<>]/g, "")
            .slice(0, 16) || "Survivor";
        }

        // Validate incoming coordinates.
        if (
          Number.isFinite(message.x) &&
          Number.isFinite(message.z) &&
          Number.isFinite(message.yaw)
        ) {
          current.x = Math.max(-96, Math.min(96, message.x));
          current.z = Math.max(-96, Math.min(96, message.z));
          current.yaw = message.yaw;
        }

        if (Number.isFinite(message.y)) {
          current.y = Math.max(0, Math.min(30, message.y));
        }

        this.broadcast();
      } catch {
        // Ignore malformed messages.
      }
    });

    const removePlayer = () => {
      this.players.delete(server);
      this.broadcast();
    };

    server.addEventListener("close", removePlayer);
    server.addEventListener("error", removePlayer);

    server.send(JSON.stringify({
      type: "welcome",
      id: player.id,
      players: [...this.players.values()]
    }));

    this.broadcast();

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  broadcast() {
    const message = JSON.stringify({
      type: "players",
      players: [...this.players.values()]
    });

    for (const socket of this.players.keys()) {
      try {
        socket.send(message);
      } catch {
        this.players.delete(socket);
      }
    }
  }
}
