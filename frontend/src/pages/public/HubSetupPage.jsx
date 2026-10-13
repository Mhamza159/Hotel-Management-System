import React, { useState } from 'react';
import { Server, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import AuthSplitLayout from '../../layouts/AuthSplitLayout';
import { desktopRuntime, normalizeHubUrl, saveMobileHubUrl } from '../../config/runtime';

const TEST_TIMEOUT_MS = 6000;

/**
 * ============================================================================
 * HUB SETUP (ANDROID STAFF APP)
 * ============================================================================
 *
 * Android app pehli dafa yahan hotel Hub ka address maangti hai (desktop app me
 * ye kaam "File -> Hub Connection..." window karti hai). Test = Hub ka /health.
 * Save ke baad app reload hoti hai taake saari API calls naye address par jayein.
 */
export const HubSetupPage = () => {
  const [address, setAddress] = useState(desktopRuntime?.hubUrl || 'http://');
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const testHub = async () => {
    const hubUrl = normalizeHubUrl(address);
    if (!hubUrl) {
      setStatus({ state: 'error', message: 'Address sahi nahi. Misaal: http://192.168.18.140:5100' });
      return null;
    }
    setStatus({ state: 'testing', message: '' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${hubUrl}/health`, { cache: 'no-store', signal: controller.signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.status !== 'ok') throw new Error('not a hub');
      setStatus({ state: 'ok', message: `Connected: ${hubUrl}` });
      return hubUrl;
    } catch {
      setStatus({
        state: 'error',
        message: 'Hub nahi mila. Phone hotel ke WiFi par hai? Address aur port (:5100 / :5000) check karein.',
      });
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const save = async () => {
    const hubUrl = await testHub();
    if (!hubUrl) return;
    saveMobileHubUrl(hubUrl);
    window.location.replace('/login');
  };

  const busy = status.state === 'testing';

  return (
    <AuthSplitLayout
      headlinePart1="Connect to"
      headlinePart2="your hotel Hub."
      title="Hub Connection"
      subtitle="Enter the Hub address shown on the Hub PC (hub-status: Staff app Hub URL)."
    >
      {status.state === 'error' && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{status.message}</span>
        </div>
      )}
      {status.state === 'ok' && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2.5 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{status.message}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#2A2A28] block mb-1.5">Hub address</label>
          <div className="relative">
            <Server className="w-4 h-4 text-[#2B3A2A] absolute left-3.5 top-3" />
            <input
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={busy}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="http://192.168.18.140:5100"
              className="w-full bg-[#FAF8F2] border border-[#E4DFD0] rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#2A2A28] placeholder-[#2A2A28]/45 focus:outline-none focus:border-[#2B3A2A] transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={testHub}
            disabled={busy}
            className="flex-1 py-3 border border-[#2B3A2A] text-[#2B3A2A] font-sans font-semibold text-xs uppercase tracking-[0.14em] rounded-[8px] disabled:opacity-60 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Test</span>}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 py-3 bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] font-sans font-semibold text-xs uppercase tracking-[0.14em] rounded-[8px] disabled:opacity-60 cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </AuthSplitLayout>
  );
};

export default HubSetupPage;
