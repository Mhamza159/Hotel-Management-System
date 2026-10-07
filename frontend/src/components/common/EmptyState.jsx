import React from 'react';
import { KeyRound, Bell } from 'lucide-react';

export const EmptyState = ({
  icon = 'key', // 'key' | 'bell'
  title = 'No items found',
  description = 'Try adjusting your search criteria or filters.',
  action = null,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-[#2A3547] bg-[#131A26]/50 my-6">
      <div className="w-12 h-12 rounded-full bg-[#1B2433] flex items-center justify-center mb-4 text-[#C9A15A] border border-[#2A3547]">
        {icon === 'bell' ? (
          <Bell className="w-6 h-6 stroke-[1.5]" />
        ) : (
          <KeyRound className="w-6 h-6 stroke-[1.5]" />
        )}
      </div>
      <h3 className="text-base font-semibold text-[#ECEFF3] mb-1">{title}</h3>
      <p className="text-sm text-[#8791A3] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
