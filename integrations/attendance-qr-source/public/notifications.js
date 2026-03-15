// notifications.js
// نظام إشعارات أنيق موحّد للتطبيق

class NotificationSystem {
  constructor() {
    this.createContainer();
  }

  createContainer() {
    if (document.getElementById('notificationContainer')) return;
    
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 500px;
      width: 90%;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  show(message, type = 'info', duration = 4000) {
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const colors = {
      success: { bg: '#d4edda', border: '#28a745', text: '#155724' },
      error: { bg: '#f8d7da', border: '#dc3545', text: '#721c24' },
      warning: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
      info: { bg: '#d1ecf1', border: '#17a2b8', text: '#0c5460' }
    };

    const color = colors[type] || colors.info;
    const icon = icons[type] || icons.info;

    notification.style.cssText = `
      background: ${color.bg};
      color: ${color.text};
      border: 2px solid ${color.border};
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 15px;
      font-weight: 500;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
      pointer-events: all;
      animation: slideDown 0.3s ease forwards;
      max-width: 100%;
      word-wrap: break-word;
    `;

    notification.innerHTML = `
      <span style="font-size: 24px; flex-shrink: 0;">${icon}</span>
      <span style="flex: 1; line-height: 1.4;">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none; border:none; color:inherit; font-size:20px; cursor:pointer; padding:0; margin:0; opacity:0.6; flex-shrink: 0; width:24px; height:24px; display:flex; align-items:center; justify-content:center; transition: opacity 0.2s;">×</button>
    `;

    const container = document.getElementById('notificationContainer');
    container.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => notification.remove(), 300);
      }, duration);
    }

    return notification;
  }

  success(message, duration = 4000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 5000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 4500) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 4000) {
    return this.show(message, 'info', duration);
  }
}

// Create global instance
const notify = new NotificationSystem();

// Add CSS animations
if (!document.getElementById('notificationStyles')) {
  const style = document.createElement('style');
  style.id = 'notificationStyles';
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .notification-toast button:hover {
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(style);
}

// Override alert for backward compatibility (optional)
window.showNotification = (message, type = 'info') => {
  notify.show(message, type);
};
