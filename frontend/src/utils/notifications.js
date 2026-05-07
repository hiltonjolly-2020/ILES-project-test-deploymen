import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Named Exports
export const notifySuccess = (message, options = {}) => {
  toast.success(message, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options
  });
};

export const notifyError = (message, options = {}) => {
  toast.error(message, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options
  });
};

export const notifyInfo = (message, options = {}) => {
  toast.info(message, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options
  });
};

export const notifyWarning = (message, options = {}) => {
  toast.warning(message, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options
  });
};

// Default Export - For components that import 'notifications'
const notifications = {
  notifySuccess,
  notifyError,
  notifyInfo,
  notifyWarning
};

export default notifications;