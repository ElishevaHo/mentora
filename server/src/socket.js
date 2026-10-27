import { Server } from 'socket.io';
import { config } from './config.js';
import { verifyToken } from './middleware/auth.js';

let io = null;

const room = (userId) => `user:${userId}`;

export function attachSocket(httpServer) {
  io = new Server(httpServer, {
    cors: config.isProd ? undefined : { origin: config.clientOrigin },
  });

  io.use((socket, next) => {
    try {
      socket.data.userId = verifyToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(room(socket.data.userId));

    socket.on('typing', (payload) => {
      const to = Number(payload?.to);
      if (Number.isInteger(to)) {
        socket.to(room(to)).emit('typing', { from: socket.data.userId });
      }
    });
  });
}

/** Push an event to every open tab of a user. */
export function notify(userId, event, payload) {
  io?.to(room(userId)).emit(event, payload);
}
