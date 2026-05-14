import { io, type Socket } from 'socket.io-client';
import { tokenStorage } from './secure-storage';

const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_URL ??
  // Strip the /api/v1 prefix from the HTTP base URL to get the WS origin.
  (process.env.EXPO_PUBLIC_API_URL ?? 'https://workaapi-production.up.railway.app/api/v1').replace(
    /\/api\/v1$/,
    '',
  );

let socket: Socket | null = null;

export async function getChatSocket(): Promise<Socket> {
  if (socket && socket.connected) return socket;
  const token = await tokenStorage.getAccess();
  socket = io(`${WS_BASE_URL}/ws/chat`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function disconnectChatSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
