import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useWalletStore } from '../../store/wallet.store';
import { useAuthStore } from '../../store/auth.store';
import '../../styles/components/notifications.scss';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'alert';
  message: string;
  createdAt: Date;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const { connect, on, off } = useSocket();
  const { setBalance } = useWalletStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const socket = connect();

    // Wallet crédité
    on('wallet:credited', (data: any) => {
      setBalance(parseFloat(data.newBalance));
      addNotification('success', data.message);
    });

    // Wallet débité
    on('wallet:debited', (data: any) => {
      setBalance(parseFloat(data.newBalance));
      addNotification('warning', data.message);
    });

    // Compte suspendu/banni
    on('account:status_changed', (data: any) => {
      addNotification('error', data.message);
    });

    // Jackpot gagné par le joueur
    on('jackpot:won', (data: any) => {
      addNotification('success', data.message);
    });

    // Jackpot gagné par quelqu'un d'autre
    on('jackpot:won_global', (data: any) => {
      addNotification('info', `🎰 ${data.username} vient de remporter le jackpot de ${data.amount?.toLocaleString()} jetons sur ${data.gameType} !`);
    });


    // Alertes admin
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      on('alert:new', (data: any) => {
        setUnreadAlerts((prev) => prev + 1);
        addNotification('alert', `🚨 ${data.message}`);
      });
    }

    return () => {
      off('wallet:credited');
      off('wallet:debited');
      off('account:status_changed');
      off('alert:new');
      off('jackpot:won');
      off('jackpot:won_global');
    };
  }, [user]);

  const addNotification = (type: Notification['type'], message: string) => {
    const id = crypto.randomUUID();
    setNotifications((prev) => [...prev, { id, type, message, createdAt: new Date() }]);

    // Auto-suppression après 5 secondes
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="notifications">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`notification notification--${notif.type}`}
          onClick={() => removeNotification(notif.id)}
        >
          <span className="notification__message">{notif.message}</span>
          <button className="notification__close">✕</button>
        </div>
      ))}
    </div>
  );
};

export default Notifications;