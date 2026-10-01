import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../services/messageService';
import { X, Send, Loader2 } from 'lucide-react';
import { POLL_INTERVALS } from '../constants';

const ChatDrawer = ({ bookingId, otherPartyName = 'Driver / Passenger', isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const fetchMessages = async (showLoading = false) => {
    if (!bookingId) return;
    if (showLoading) setIsLoading(true);
    try {
      const res = await messageService.getMessagesByBooking(bookingId);
      if (res.success) {
        setMessages(res.messages || []);
      }
    } catch (err) {
      console.warn('[Chat Poll Error]', err.message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    fetchMessages(true);
    const timerId = setInterval(() => {
      fetchMessages(false);
    }, POLL_INTERVALS.CHAT || 3000);

    return () => clearInterval(timerId);
  }, [isOpen, bookingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const res = await messageService.sendMessage({ bookingId, text });
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch (err) {
      console.warn('[Send Message Error]', err.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        style={{
          maxWidth: '480px',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '520px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chat Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.875rem 1rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div className="user-avatar-sm">{otherPartyName.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {otherPartyName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--status-inprogress-text)' }}>
                Trip Chat
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.25rem 0.5rem', minHeight: '32px' }}
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message Thread */}
        <div
          style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
            background: 'var(--bg-surface-subtle)',
          }}
        >
          {isLoading ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div
              style={{
                margin: 'auto',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
              }}
            >
              No messages yet. Send a message to coordinate pickup.
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId?._id === user?._id || msg.senderId === user?._id;
              return (
                <div
                  key={msg._id}
                  style={{
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                  }}
                >
                  <div
                    style={{
                      background: isMine ? 'var(--primary)' : 'var(--bg-surface)',
                      color: isMine ? '#ffffff' : 'var(--text-primary)',
                      padding: '0.5rem 0.875rem',
                      borderRadius: isMine ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                      fontSize: '0.875rem',
                      border: isMine ? 'none' : '1px solid var(--border)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.text}
                  </div>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                      textAlign: isMine ? 'right' : 'left',
                    }}
                  >
                    {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            style={{ minHeight: '40px' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!inputText.trim() || isSending}
            style={{ minHeight: '40px', padding: '0.5rem 1rem' }}
          >
            {isSending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatDrawer;
