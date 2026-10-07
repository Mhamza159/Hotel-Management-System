import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export const Toast = ({ type = 'info', message, onClose }) => {
  const configs = {
    success: {
      border: 'border-emerald-500/30',
      bg: 'bg-[#131A26]',
      text: 'text-emerald-400',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[1.5]" />,
    },
    error: {
      border: 'border-rose-500/30',
      bg: 'bg-[#131A26]',
      text: 'text-rose-400',
      icon: <XCircle className="w-5 h-5 text-rose-400 stroke-[1.5]" />,
    },
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-[#131A26]',
      text: 'text-amber-400',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 stroke-[1.5]" />,
    },
    info: {
      border: 'border-[#3FD0C9]/30',
      bg: 'bg-[#131A26]',
      text: 'text-[#3FD0C9]',
      icon: <Info className="w-5 h-5 text-[#3FD0C9] stroke-[1.5]" />,
    },
  };

  const config = configs[type] || configs.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg border ${config.border} ${config.bg} shadow-2xl max-w-md w-full`}
    >
      <div className="shrink-0">{config.icon}</div>
      <p className="text-sm text-[#ECEFF3] flex-1 font-medium">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="text-[#8791A3] hover:text-[#ECEFF3] transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};

export default Toast;
