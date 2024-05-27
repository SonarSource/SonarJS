//export const handleDisconnect = (io: Server, socket: Socket, globalState: GlobalState, connectedUsers: ConnectedUsers) => {
const handleDisconnect = (io, socket, globalState, connectedUsers) => {
   const user = connectedUsers[socket.id];
   if (!user.room)
     return;

  if (globalState[user.room]?.players?.length == 0) {
    delete globalState[user?.room];
  }

  if (globalState[user.room]?.players?.every((p) => p === "disconnected")) {
    delete globalState[user?.room];
  }

  // ...
};

const socket = {
    id: 'foo',
};

connectedUsers = {
    foo: {
        room: 'bar'
    }
}

const globalState = {
    bar: undefined,
}

handleDisconnect(null, socket, globalState, connectedUsers);
