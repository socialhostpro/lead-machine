// Toast Notification System
// Simple toast notifications for user feedback

export interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  type?: 'success' | 'error' | 'info' | 'warning';
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
  duration: number;
}

class ToastManager {
  private toasts: Toast[] = [];
  private listeners: Array<(toasts: Toast[]) => void> = [];
  private container: HTMLElement | null = null;

  constructor() {
    this.initializeContainer();
  }

  private initializeContainer() {
    if (typeof window === 'undefined') return;

    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(this.container);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private renderToast(toast: Toast): HTMLElement {
    const toastElement = document.createElement('div');
    toastElement.setAttribute('data-id', toast.id);
    toastElement.className = `
      toast-item
      min-w-[300px] max-w-md p-4 rounded-lg shadow-lg border
      transform transition-all duration-300 ease-in-out
      pointer-events-auto cursor-pointer
      ${this.getToastStyles(toast.type)}
    `;

    const icon = this.getToastIcon(toast.type);
    
    toastElement.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 mt-0.5">
          ${icon}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-900 dark:text-white">
            ${toast.message}
          </p>
        </div>
        <button class="flex-shrink-0 ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    `;

    // Add click handler to close
    const closeButton = toastElement.querySelector('button');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(toast.id);
      });
    }

    // Auto-remove after duration
    setTimeout(() => {
      this.remove(toast.id);
    }, toast.duration);

    return toastElement;
  }

  private getToastStyles(type: 'success' | 'error' | 'info' | 'warning'): string {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  }

  private getToastIcon(type: 'success' | 'error' | 'info' | 'warning'): string {
    switch (type) {
      case 'success':
        return '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>';
      case 'error':
        return '<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>';
      case 'warning':
        return '<svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
      case 'info':
      default:
        return '<svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>';
    }
  }

  show(message: string, options: ToastOptions = {}): string {
    const toast: Toast = {
      id: this.generateId(),
      message,
      type: options.type || 'info',
      timestamp: Date.now(),
      duration: options.duration || 3000,
    };

    this.toasts.push(toast);
    
    if (this.container) {
      const toastElement = this.renderToast(toast);
      this.container.appendChild(toastElement);
      
      // Trigger animation
      requestAnimationFrame(() => {
        toastElement.classList.add('slide-in');
      });
    }

    return toast.id;
  }

  remove(id: string): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index > -1) {
      this.toasts.splice(index, 1);
      
      if (this.container) {
        const toastElement = this.container.querySelector(`[data-id="${id}"]`) as HTMLElement;
        if (toastElement) {
          toastElement.classList.add('slide-out');
          setTimeout(() => {
            if (toastElement.parentNode) {
              toastElement.parentNode.removeChild(toastElement);
            }
          }, 300);
        }
      }
    }
  }

  clear(): void {
    this.toasts = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  success(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'success' });
  }

  error(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'error' });
  }

  warning(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'warning' });
  }

  info(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'info' });
  }
}

// Singleton instance
const toastManager = new ToastManager();

// Convenience exports
export const toast = {
  show: (message: string, options?: ToastOptions) => toastManager.show(message, options),
  success: (message: string, options?: Omit<ToastOptions, 'type'>) => toastManager.success(message, options),
  error: (message: string, options?: Omit<ToastOptions, 'type'>) => toastManager.error(message, options),
  warning: (message: string, options?: Omit<ToastOptions, 'type'>) => toastManager.warning(message, options),
  info: (message: string, options?: Omit<ToastOptions, 'type'>) => toastManager.info(message, options),
  remove: (id: string) => toastManager.remove(id),
  clear: () => toastManager.clear(),
};

export default toast;