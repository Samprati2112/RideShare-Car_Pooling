import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const Alert = ({ type = 'error', message, onClose }) => {
  if (!message) return null;

  const iconMap = {
    error: <AlertCircle size={18} />,
    success: <CheckCircle size={18} />,
    info: <Info size={18} />,
  };

  const classMap = {
    error: 'alert-error',
    success: 'alert-success',
    info: 'alert-info',
  };

  return (
    <div className={`alert ${classMap[type] || 'alert-error'}`}>
      <span style={{ flexShrink: 0 }}>{iconMap[type]}</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
