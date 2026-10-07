import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Clock,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { chatService } from '../../services/chat.service';
import { useAuthStore } from '../../stores/useAuthStore';
import { ROLES } from '../../config/constants';

const QUICK_GUEST_PROMPTS = [
  { label: 'Check Deluxe Availability', tool: 'checkAvailability', args: { roomType: 'deluxe' } },
  { label: 'My Recent Bookings', tool: 'getMyBookings', args: {} },
  { label: 'Presidential Suite Specs', tool: 'getRoomDetails', args: { roomType: 'presidential' } },
  { label: 'Check-in Policy', message: 'What are the check-in and check-out policies at Grand Horizon?' },
];

const QUICK_STAFF_PROMPTS = [
  { label: "Today's Occupancy", message: "What is today's occupancy rate and arrivals overview?" },
  { label: 'Pending Cancellations', message: 'Are there any pending cancellation requests requiring front-desk review?' },
  { label: 'Dirty Rooms Queue', message: 'Show me rooms that are currently dirty or pending cleaning.' },
  { label: 'Suite Availability', tool: 'checkAvailability', args: { roomType: 'deluxe' } },
];

export const ChatDrawer = () => {
  const { user } = useAuthStore();
  const isStaff = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.RECEPTIONIST || user?.role === ROLES.HOUSEKEEPING;
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: isStaff
        ? 'Welcome to Grand Horizon Operations Copilot. How may I assist your flight-ops, room inventory, or front-desk queries today?'
        : 'Welcome to Grand Horizon! I am your personal AI Concierge. How may I assist your stay or reservation today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (customMessage, toolCallName = null, toolCallArgs = {}) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim() && !toolCallName) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend || `Execute ${toolCallName}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customMessage) setInput('');
    setLoading(true);

    try {
      const payload = {
        message: textToSend,
        ...(toolCallName ? { toolCallName, toolCallArgs } : {}),
      };

      const res = await chatService.sendMessage(payload, user?.role);

      const assistantMsg = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: res.message || 'I have processed your request.',
        toolResult: res.toolResult || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: err?.message || 'I encountered an issue processing your query. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all group backdrop-blur-md ${
          isStaff
            ? 'bg-[#131A26] border border-[#2A3547] text-[#ECEFF3] hover:border-[#3FD0C9]/50 shadow-[#0A0F1A]/80'
            : 'bg-[#FAF8F2] border border-[#E4DFD0] text-[#2A2A28] hover:border-[#2B3A2A]/40'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
            isStaff
              ? 'bg-[#3FD0C9]/10 border border-[#3FD0C9]/30 text-[#3FD0C9]'
              : 'bg-[#2B3A2A]/10 border border-[#2B3A2A]/20 text-[#2B3A2A]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-left pr-1">
          <span className={`text-xs font-bold block leading-none ${isStaff ? 'text-[#3FD0C9]' : 'text-[#2B3A2A]'}`}>
            {isStaff ? 'Staff Copilot' : 'AI Concierge'}
          </span>
          <span className={`text-[10px] leading-none mt-0.5 block font-mono ${isStaff ? 'text-[#8791A3]' : 'text-[#4A6348]'}`}>
            {isStaff ? 'Flight-Ops Active' : 'Online • 24/7'}
          </span>
        </div>
      </motion.button>

      {/* Slide-out Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[550px] bg-[#131A26] border border-[#2A3547] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden font-sans"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#2A3547] bg-[#0A0F1A]/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isStaff
                      ? 'bg-[#3FD0C9]/10 border border-[#3FD0C9]/30 text-[#3FD0C9]'
                      : 'bg-[#C9A15A]/10 border border-[#C9A15A]/30 text-[#C9A15A]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#ECEFF3] flex items-center gap-1.5 font-display">
                    {isStaff ? 'Staff Operations Copilot' : 'Grand Horizon Concierge'}
                  </h3>
                  <span className="text-[10px] text-[#8791A3] block font-mono">
                    {isStaff ? 'Flight-Ops AI Assistant' : 'Autonomous Guest Assistant'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#8791A3] hover:text-[#ECEFF3] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Prompts Bar */}
            <div className="p-2 border-b border-[#2A3547] bg-[#0A0F1A]/40 flex gap-1.5 overflow-x-auto select-none no-scrollbar">
              {(isStaff ? QUICK_STAFF_PROMPTS : QUICK_GUEST_PROMPTS).map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.message || null, p.tool, p.args)}
                  disabled={loading}
                  className="whitespace-nowrap text-[11px] px-2.5 py-1 bg-[#1B2433] hover:bg-[#2A3547] text-[#ECEFF3] border border-[#2A3547] rounded-full transition-colors shrink-0"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0F1A]/20">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {msg.role === 'user' ? (
                      <span className="text-[10px] text-[#8791A3]">You &bull; {msg.timestamp}</span>
                    ) : (
                      <span className="text-[10px] text-[#C9A15A] font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Concierge &bull; {msg.timestamp}
                      </span>
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#C9A15A] text-[#0A0F1A] font-medium rounded-tr-none'
                        : msg.isError
                        ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-tl-none'
                        : 'bg-[#1B2433] text-[#ECEFF3] border border-[#2A3547] rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>

                    {/* Formatted Tool Results if returned */}
                    {msg.toolResult && (
                      <div className="mt-2 pt-2 border-t border-[#2A3547] font-mono text-[10px] text-[#8791A3]">
                        <pre className="overflow-x-auto max-h-32 p-1.5 bg-[#0A0F1A] rounded">
                          {JSON.stringify(msg.toolResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-[#8791A3] p-2">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-[#C9A15A] rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-[#C9A15A] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-[#C9A15A] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>Concierge is formulating guidance...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 border-t border-[#2A3547] bg-[#0A0F1A]/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about rooms, dining, or amenities..."
                disabled={loading}
                className="flex-1 bg-[#131A26] border border-[#2A3547] text-xs text-[#ECEFF3] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#C9A15A] transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 bg-[#C9A15A] hover:bg-[#d8b066] disabled:opacity-50 text-[#0A0F1A] rounded-xl transition-colors font-bold"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatDrawer;
