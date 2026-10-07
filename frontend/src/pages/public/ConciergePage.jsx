import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Send,
  BedDouble,
  Compass,
  UtensilsCrossed,
  ShieldCheck,
  CalendarCheck,
} from 'lucide-react';
import { chatService } from '../../services/chat.service';
import { Navbar } from '../../components/guest/Navbar';
import { Footer } from '../../components/guest/Footer';
import { useAuthStore } from '../../stores/useAuthStore';

const EXPERIENCE_TOPICS = [
  {
    icon: BedDouble,
    title: 'Suite Recommender',
    description: 'Tell our AI your party size and preferences for tailored room recommendations.',
    prompt: 'Can you recommend the best suite for a couple celebrating an anniversary?',
  },
  {
    icon: UtensilsCrossed,
    title: 'Fine Dining & Menus',
    description: 'Inquire about our Michelin-starred in-house restaurants and sommelier pairings.',
    prompt: 'What are the dining options and dinner reservation timings tonight?',
  },
  {
    icon: Compass,
    title: 'Exclusive Experiences',
    description: 'Custom private yacht charters, spa wellness packages, and helicopter transfers.',
    prompt: 'What wellness spa treatments and private city excursions do you arrange?',
  },
];

export const ConciergePage = () => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Greetings ${user?.name ? user.name : 'esteemed guest'}. I am the Grand Horizon Autonomous AI Concierge. How may I curate your stay experience or assist with your suite inquiries today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (messageText) => {
    const text = messageText || input;
    if (!text.trim()) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput('');
    setLoading(true);

    try {
      const res = await chatService.sendGuestMessage({ message: text });
      const assistantMsg = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: res.message || 'I have curated the details for your inquiry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: err?.message || 'Apologies, our concierge system is momentarily adjusting. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2A2A28] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12">
        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF8F2] border border-[#E4DFD0] text-[#2B3A2A] text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#2B3A2A]" />
            <span>Autonomous Intelligence &bull; 24/7 Availability</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#2A2A28] tracking-tight">
            Grand Horizon Concierge
          </h1>
          <p className="text-sm text-[#2A2A28]/70 mt-2 font-serif italic">
            "Your personal digital sommelier, itinerary planner, and hospitality advisor."
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {EXPERIENCE_TOPICS.map((topic, idx) => {
            const Icon = topic.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                onClick={() => handleSend(topic.prompt)}
                className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] hover:border-[#2B3A2A]/50 transition-all cursor-pointer group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A] mb-3 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#2A2A28] font-display">
                  {topic.title}
                </h3>
                <p className="text-xs text-[#2A2A28]/70 mt-1 leading-relaxed">
                  {topic.description}
                </p>
                <span className="text-[11px] text-[#2B3A2A] font-semibold mt-3 block group-hover:underline">
                  Inquire Now &rarr;
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Main Conversation Container */}
        <div className="bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl overflow-hidden shadow-lg flex flex-col h-[520px]">
          {/* Messages Display */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F5F1E8]/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <span className="text-[10px] text-[#2A2A28]/60 mb-1 px-1">
                  {msg.role === 'user' ? 'You' : 'Grand Horizon Concierge'} &bull; {msg.timestamp}
                </span>
                <div
                  className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#2B3A2A] text-[#F5F1E8] font-medium rounded-tr-none shadow-sm'
                      : msg.isError
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-700 rounded-tl-none'
                      : 'bg-[#FAF8F2] text-[#2A2A28] border border-[#E4DFD0] rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#2A2A28]/70 p-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[#2B3A2A] rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-[#2B3A2A] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-[#2B3A2A] rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>Curating bespoke response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 border-t border-[#E4DFD0] bg-[#FAF8F2] flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask our AI Concierge about suite features, reservations, or local attractions..."
              disabled={loading}
              className="flex-1 bg-[#F5F1E8] border border-[#E4DFD0] text-sm text-[#2A2A28] placeholder-[#2A2A28]/40 px-4 py-3 rounded-xl focus:outline-none focus:border-[#2B3A2A] transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-[#2B3A2A] hover:bg-[#1F2B20] disabled:opacity-50 text-[#F5F1E8] rounded-xl font-semibold transition-colors flex items-center gap-2 text-sm cursor-pointer shadow-sm"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ConciergePage;
