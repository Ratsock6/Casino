import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/auth.store';
import { getChatMessagesApi, type ChatMessage } from '../../api/chat.api';
import '../../styles/components/chat.scss';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'ADMIN',
  VIP: 'VIP',
};

const ChatWidget: React.FC = () => {
  const { user } = useAuthStore();
  const { connect, on, off, emit } = useSocket();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  // Charge l'historique + branche les events temps réel
  useEffect(() => {
    connect();
    getChatMessagesApi().then((msgs) => {
      setMessages(msgs);
      scrollToBottom();
    }).catch(() => { /* ignore */ });

    const handleMessage = (data: unknown) => {
      const msg = data as ChatMessage;
      setMessages((prev) => [...prev, msg]);
      setOpen((isOpen) => {
        if (!isOpen) setUnread((u) => u + 1);
        return isOpen;
      });
    };
    const handleDeleted = (data: unknown) => {
      const { messageId } = data as { messageId: string };
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };
    const handleError = (data: unknown) => {
      const { message } = data as { message: string };
      setError(message);
      setTimeout(() => setError(''), 3000);
    };

    on('chat:message', handleMessage);
    on('chat:deleted', handleDeleted);
    on('chat:error', handleError);

    return () => {
      off('chat:message');
      off('chat:deleted');
      off('chat:error');
    };
  }, [connect, on, off, scrollToBottom]);

  useEffect(() => {
    if (open) { scrollToBottom(); setUnread(0); }
  }, [open, messages, scrollToBottom]);

  const handleSend = () => {
    const content = input.trim();
    if (!content) return;
    emit('chat:send', { content });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = (messageId: string) => {
    emit('chat:delete', { messageId });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        className="chat-fab"
        onClick={() => setOpen((o) => !o)}
        title={open ? 'Fermer le chat' : 'Ouvrir le chat'}
      >
        {open ? '✕' : '💬'}
        {!open && unread > 0 && <span className="chat-fab__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {/* Fenêtre de chat */}
      {open && (
        <div className="chat-window">
          <div className="chat-window__header">
            <span>💬 Chat du Bellagio</span>
            <button className="chat-window__close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chat-window__messages" ref={listRef}>
            {messages.length === 0 ? (
              <p className="chat-window__empty">Aucun message pour le moment. Lance la conversation !</p>
            ) : (
              messages.map((m) => {
                const roleTag = ROLE_LABEL[m.role];
                const isMine = m.userId === user?.id;
                return (
                  <div key={m.id} className={`chat-msg ${isMine ? 'chat-msg--mine' : ''}`}>
                    <div className="chat-msg__head">
                      <span className={`chat-msg__author chat-msg__author--${(m.role || '').toLowerCase()}`}>
                        {roleTag && <span className="chat-msg__tag">{roleTag}</span>}
                        {m.username}
                      </span>
                      <span className="chat-msg__time">{formatTime(m.createdAt)}</span>
                      {isAdmin && (
                        <button
                          className="chat-msg__delete"
                          onClick={() => handleDelete(m.id)}
                          title="Supprimer ce message"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <p className="chat-msg__content">{m.content}</p>
                  </div>
                );
              })
            )}
          </div>

          {error && <p className="chat-window__error">{error}</p>}

          <div className="chat-window__input">
            <input
              type="text"
              value={input}
              maxLength={300}
              placeholder="Écris un message..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={handleSend} disabled={!input.trim()}>Envoyer</button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
