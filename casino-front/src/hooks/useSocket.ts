import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

let socketInstance: Socket | null = null;

export const useSocket = () => {
  const { token } = useAuthStore();

  const connect = useCallback(() => {
    if (socketInstance?.connected) return socketInstance;

    socketInstance = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connecté');
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket déconnecté');
    });

    return socketInstance;
  }, [token]);

  const disconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }, []);

  const on = useCallback((event: string, callback: (data: unknown) => void) => {
    if (!socketInstance) return;
    socketInstance.on(event, callback);
  }, []);

  const off = useCallback((event: string) => {
    if (!socketInstance) return;
    socketInstance.off(event);
  }, []);

  return { connect, disconnect, on, off, socket: socketInstance };
};