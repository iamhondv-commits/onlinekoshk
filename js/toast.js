(function () {
    'use strict';

    // Toast Container
    let toastContainer = null;

    function createToastContainer() {
        if (toastContainer) return toastContainer;

        toastContainer = document.createElement('div');
        toastContainer.id = 'koshk-toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
        return toastContainer;
    }

    // Toast Types
    const TOAST_TYPES = {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    };

    // Toast Icons
    const TOAST_ICONS = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-times-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };

    // Toast Colors
    const TOAST_COLORS = {
        success: { bg: '#d1fae5', border: '#10b981', icon: '#10b981', text: '#065f46' },
        error: { bg: '#fee2e2', border: '#ef4444', icon: '#ef4444', text: '#991b1b' },
        warning: { bg: '#fef3c7', border: '#f59e0b', icon: '#f59e0b', text: '#92400e' },
        info: { bg: '#dbeafe', border: '#3b82f6', icon: '#3b82f6', text: '#1e40af' }
    };

    function showToast(message, type = 'info', duration = 4000) {
        const container = createToastContainer();
        const colors = TOAST_COLORS[type] || TOAST_COLORS.info;
        const icon = TOAST_ICONS[type] || TOAST_ICONS.info;

        const toast = document.createElement('div');
        toast.className = 'koshk-toast';
        toast.style.cssText = `
            background: ${colors.bg};
            border: 1px solid ${colors.border};
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            pointer-events: auto;
            transform: translateX(-100%);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            min-width: 300px;
        `;

        toast.innerHTML = `
            <div style="color: ${colors.icon}; font-size: 20px; flex-shrink: 0; margin-top: 2px;">
                ${icon}
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="color: ${colors.text}; font-size: 14px; font-weight: 600; line-height: 1.5; word-wrap: break-word;">
                    ${message}
                </div>
            </div>
            <button class="toast-close-btn" style="
                background: transparent;
                border: none;
                color: ${colors.text};
                cursor: pointer;
                font-size: 16px;
                padding: 4px;
                opacity: 0.6;
                transition: opacity 0.2s;
                flex-shrink: 0;
            ">&times;</button>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        // Close button functionality
        const closeBtn = toast.querySelector('.toast-close-btn');
        closeBtn.addEventListener('click', () => {
            removeToast(toast);
        });

        // Auto remove
        const timeoutId = setTimeout(() => {
            removeToast(toast);
        }, duration);

        // Store timeout for manual removal
        toast.dataset.timeoutId = timeoutId;
    }

    function removeToast(toast) {
        if (toast.dataset.timeoutId) {
            clearTimeout(parseInt(toast.dataset.timeoutId));
        }

        toast.style.transform = 'translateX(-100%)';
        toast.style.opacity = '0';

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Convenience methods
    function showSuccess(message, duration) {
        showToast(message, TOAST_TYPES.SUCCESS, duration);
    }

    function showError(message, duration) {
        showToast(message, TOAST_TYPES.ERROR, duration);
    }

    function showWarning(message, duration) {
        showToast(message, TOAST_TYPES.WARNING, duration);
    }

    function showInfo(message, duration) {
        showToast(message, TOAST_TYPES.INFO, duration);
    }

    // Export to global scope
    window.KoshkToast = {
        show: showToast,
        success: showSuccess,
        error: showError,
        warning: showWarning,
        info: showInfo,
        TOAST_TYPES
    };

    // Override default alert for better UX (optional)
    window.showKoshkAlert = function(message, type = 'info') {
        showToast(message, type, 5000);
    };

})();
