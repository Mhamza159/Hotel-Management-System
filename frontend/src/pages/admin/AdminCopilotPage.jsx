import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Terminal,
  Send,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Clock,
  BedDouble,
  CalendarCheck,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import { chatService } from '../../services/chat.service';
import { ConfirmationActionModal } from '../../components/admin/ConfirmationActionModal';

const OPERATIONAL_COMMANDS = [
  {
    label: 'Query Today Arrivals',
    tool: 'getBookingsForDateRange',
    args: { from: new Date().toISOString() },
  },
  {
    label: 'Live Occupancy Stats',
    tool: 'getOccupancyStats',
    args: { date: new Date().toISOString().split('T')[0] },
  },
  {
    label: 'Prepare Cancellation Challenge',
    tool: 'prepareBookingCancellation',
    needsInput: true,
    promptMsg: 'Enter Booking Reference to initiate cancellation challenge (e.g. GRH-123456):',
  },
];

export const AdminCopilotPage = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Administrative Copilot initialized. I have full operational access to hotel arrival registries, room occupancy algorithms, and the two-phase dry-run mutation gate.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Two-Phase Confirmation Modal state
  const [pendingAction, setPendingAction] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (customMessage, toolCallName = null, toolCallArgs = {}) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim() && !toolCallName) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend || `Execute Tool: ${toolCallName}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customMessage) setInput('');
    setLoading(true);
    setError(null);

    try {
      const payload = {
        message: textToSend,
        ...(toolCallName ? { toolCallName, toolCallArgs } : {}),
      };

      const res = await chatService.sendAdminMessage(payload);

      // Check if tool requires two-phase dry-run confirmation
      if (res.toolResult?.requiresConfirmation && res.toolResult?.pendingAction) {
        setPendingAction(res.toolResult.pendingAction);
      }

      const assistantMsg = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: res.message || 'Operational command completed successfully.',
        toolResult: res.toolResult || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err?.message || 'Failed to execute administrative command.');
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: `Error: ${err?.message || 'Command failed.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCommand = (cmd) => {
    if (cmd.needsInput) {
      const ref = window.prompt(cmd.promptMsg);
      if (!ref || !ref.trim()) return;
      handleSend(null, cmd.tool, { bookingReference: ref.trim() });
    } else {
      handleSend(null, cmd.tool, cmd.args);
    }
  };

  const handleConfirmationSuccess = (result) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `confirmed_${Date.now()}`,
        role: 'assistant',
        content: `Two-Phase Mutation Confirmed & Executed! Target booking has been cancelled and refund processed.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolResult: result,
      },
    ]);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      {/* Top Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
          pb: 2,
          borderBottom: '1px solid #2A3547',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3FD0C9]/10 border border-[#3FD0C9]/30 flex items-center justify-center text-[#3FD0C9]">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#ECEFF3' }}>
              Administrative AI Copilot
            </Typography>
            <Typography variant="caption" sx={{ color: '#8791A3' }}>
              Autonomous flight-ops commands with two-phase signed mutation safeguards
            </Typography>
          </div>
        </div>

        <Chip
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          label="Human-in-the-Loop Active"
          size="small"
          sx={{
            backgroundColor: 'rgba(62, 207, 142, 0.15)',
            color: '#3ECF8E',
            fontWeight: 700,
            fontSize: '0.7rem',
          }}
        />
      </Box>

      {/* Quick Action Commands Bar */}
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {OPERATIONAL_COMMANDS.map((cmd, idx) => (
          <Button
            key={idx}
            size="small"
            variant="outlined"
            onClick={() => handleTriggerCommand(cmd)}
            disabled={loading}
            sx={{
              color: '#3FD0C9',
              borderColor: 'rgba(63, 208, 201, 0.3)',
              backgroundColor: '#131A26',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              '&:hover': {
                borderColor: '#3FD0C9',
                backgroundColor: 'rgba(63, 208, 201, 0.1)',
              },
            }}
          >
            {cmd.label}
          </Button>
        ))}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#F87171' }}>
          {error}
        </Alert>
      )}

      {/* Main Terminal Window */}
      <Paper
        sx={{
          backgroundColor: '#131A26',
          border: '1px solid #2A3547',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '600px',
        }}
      >
        {/* Terminal Header */}
        <div className="px-4 py-2.5 bg-[#0A0F1A] border-b border-[#2A3547] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-mono text-[#8791A3] ml-2">
              copilot.ops.internal &bull; role: super-admin
            </span>
          </div>
        </div>

        {/* Message Log Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs bg-[#0A0F1A]/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-xl ${
                msg.role === 'user'
                  ? 'bg-[#1B2433] border border-[#2A3547] text-[#ECEFF3] ml-8'
                  : msg.isError
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300 mr-8'
                  : 'bg-[#131A26] border border-[#2A3547] text-[#ECEFF3] mr-8'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 text-[10px] text-[#8791A3]">
                <span className="font-bold flex items-center gap-1">
                  {msg.role === 'user' ? (
                    <span className="text-[#3FD0C9]">&gt; ADMIN COMMAND</span>
                  ) : (
                    <span className="text-[#C9A15A]">&gt; COPILOT RESPONSE</span>
                  )}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>

              {/* Tool Execution Result Inspector */}
              {msg.toolResult && (
                <div className="mt-2.5 pt-2 border-t border-[#2A3547]">
                  <span className="text-[10px] text-[#3FD0C9] block mb-1">Result Payload:</span>
                  <pre className="p-2 bg-[#0A0F1A] rounded border border-[#2A3547] text-[11px] overflow-x-auto text-[#8791A3]">
                    {JSON.stringify(msg.toolResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#3FD0C9] p-2 font-mono">
              <CircularProgress size={14} color="inherit" />
              <span>Copilot evaluating parameters & executing query...</span>
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
          className="p-3 bg-[#0A0F1A] border-t border-[#2A3547] flex items-center gap-2"
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Type administrative command or natural language instruction..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#ECEFF3',
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !input.trim()}
            sx={{
              backgroundColor: '#3FD0C9',
              color: '#0A0F1A',
              fontWeight: 700,
              px: 3,
              '&:hover': { backgroundColor: '#34b3ad' },
            }}
          >
            Send
          </Button>
        </form>
      </Paper>

      {/* Two-Phase Confirmation Modal */}
      <ConfirmationActionModal
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        pendingAction={pendingAction}
        onSuccess={handleConfirmationSuccess}
      />
    </Box>
  );
};

export default AdminCopilotPage;
