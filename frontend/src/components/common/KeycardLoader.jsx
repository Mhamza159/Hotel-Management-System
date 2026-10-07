import React from 'react';
import { motion } from 'framer-motion';

/**
 * Branded Luxury Loading Motif:
 * A subtle, glowing gold line sweep mimicking a hotel keycard sensor.
 */
export const KeycardLoader = ({ message = 'Processing reservation...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-48 h-1 bg-[#1B2433] rounded-full overflow-hidden shadow-inner">
        <motion.div
          className="absolute top-0 bottom-0 w-16 bg-gradient-to-r from-transparent via-[#C9A15A] to-transparent shadow-[0_0_12px_#C9A15A]"
          initial={{ left: '-30%' }}
          animate={{ left: '100%' }}
          transition={{
            repeat: Infinity,
            duration: 1.4,
            ease: 'easeInOut',
          }}
        />
      </div>
      {message && (
        <p className="text-xs uppercase tracking-widest text-[#8791A3] font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export default KeycardLoader;
