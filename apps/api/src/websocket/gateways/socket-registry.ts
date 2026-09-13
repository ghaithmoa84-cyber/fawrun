export const SOCKET_SERVERS: {
  orders: import('socket.io').Server | null;
  admin: import('socket.io').Server | null;
} = {
  orders: null,
  admin: null,
};
