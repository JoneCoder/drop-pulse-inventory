import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to backend (proxied via Vite server)
    const backendUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socketInstance = io(backendUrl, {
      autoConnect: true,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('Successfully connected to WebSocket server');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
