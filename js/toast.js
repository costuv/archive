/**
 * Toast Notification System
 * Provides success, error, and info notifications
 */

const TOAST_DURATION = 3000; // 3 seconds

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Toast type: 'success', 'error', or 'info'
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Get appropriate icon
  let iconName = 'info';
  if (type === 'success') iconName = 'check';
  if (type === 'error') iconName = 'alert-triangle';
  
  toast.innerHTML = `
    <span class="icon">${getIcon(iconName)}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  // Add to container
  container.appendChild(toast);

  // Auto remove after duration
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300); // Match animation duration
  }, TOAST_DURATION);
}

/**
 * Show success toast
 * @param {string} message 
 */
function toastSuccess(message) {
  showToast(message, 'success');
}

/**
 * Show error toast
 * @param {string} message 
 */
function toastError(message) {
  showToast(message, 'error');
}

/**
 * Show info toast
 * @param {string} message 
 */
function toastInfo(message) {
  showToast(message, 'info');
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text 
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
