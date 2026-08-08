import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://drop-pulse-inventory.vercel.app'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const broadcastStockUpdate = (dropId: string, availableStock: number) => {
  if (io) {
    io.emit('stock_updated', { dropId, availableStock });
  }
};

export const broadcastPurchaseCompleted = (dropId: string, username: string) => {
  if (io) {
    io.emit('purchase_completed', { dropId, username });
  }
};
