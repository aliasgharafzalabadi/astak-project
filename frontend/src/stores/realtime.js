import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io } from 'socket.io-client';
import { useWalletStore } from './wallet';
import { useToastStore } from './toasts';
import { formatToman } from '@/utils/format';

export const useRealtimeStore = defineStore('realtime', () => {
  const status = ref('offline');
  let socket = null;

  function connect(token, { onSessionExpired }) {
    disconnect();
    status.value = 'connecting';

    socket = io({ auth: { token }, transports: ['websocket'] });

    socket.on('session:ready', () => {
      status.value = 'live';
    });

    socket.on('disconnect', () => {
      status.value = 'connecting';
    });

    socket.on('connect_error', (err) => {
      status.value = 'offline';
      if (err.data?.code === 'TOKEN_EXPIRED' || err.data?.code === 'INVALID_TOKEN') {
        onSessionExpired();
      }
    });

    socket.on('session:expired', () => {
      status.value = 'offline';
      onSessionExpired();
    });

    socket.on('transfer:received', (event) => {
      useToastStore().push({
        type: 'success',
        title: `+ ${formatToman(event.amount)}`,
        message: `Received from ${event.sender.fullName}${event.description ? ` · ${event.description}` : ''}`,
        timeout: 7000,
      });
      useWalletStore().markActivity();
    });
  }

  function disconnect() {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
    status.value = 'offline';
  }

  return { status, connect, disconnect };
});
