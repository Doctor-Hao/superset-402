import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    onClose: () => void;
}

const toastStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#333',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    zIndex: 1000,
};

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000); // auto close in 3s
        return () => clearTimeout(timer);
    }, [onClose]);

    return <div style={toastStyle}>{message}</div>;
};

export default Toast;
