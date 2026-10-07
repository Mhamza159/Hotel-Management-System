import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { authService } from '../../services/auth.service';
import { KeycardLoader } from '../../components/common/KeycardLoader';

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

export const ForgotPasswordPage = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    try {
      setServerError('');
      setIsSubmitting(true);

      await authService.forgotPassword({ email: data.email });
      setSentEmail(data.email);
      setIsSuccess(true);
    } catch (err) {
      console.error('Password recovery error:', err);
      // To prevent enumeration, the backend already delivers generic messages,
      // but in case of connection drop:
      setServerError(err.message || 'Unable to submit recovery request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Recover Your Password"
      subtitle="Enter your registered email address and we'll dispatch a secure recovery token"
    >
      {serverError && (
        <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {isSuccess ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-[#ECEFF3]">
            Recovery Instructions Sent
          </h2>
          <p className="text-xs text-[#8791A3] leading-relaxed max-w-xs mx-auto">
            If an account is associated with <span className="text-[#ECEFF3] font-medium">{sentEmail}</span>,
            a secure 10-minute reset token has been dispatched.
          </p>
          <div className="pt-4 border-t border-[#2A3547]">
            <Link
              to="/reset-password"
              className="inline-block py-2.5 px-6 bg-[#1B2433] hover:bg-[#2A3547] text-[#3FD0C9] text-xs font-semibold rounded-lg border border-[#2A3547] transition-colors"
            >
              Have a Token? Reset Password &rarr;
            </Link>
          </div>
          <div>
            <Link
              to="/login"
              className="inline-flex items-center text-xs text-[#8791A3] hover:text-[#ECEFF3] transition-colors mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {isSubmitting && (
            <div className="mb-4">
              <KeycardLoader message="Dispatching secure recovery token..." />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#8791A3] uppercase tracking-wider mb-2">
              Registered Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8791A3]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                disabled={isSubmitting}
                {...register('email')}
                placeholder="guest@example.com"
                className={`w-full pl-10 pr-4 py-2.5 bg-[#1B2433] border ${
                  errors.email ? 'border-rose-500' : 'border-[#2A3547]'
                } rounded-lg text-sm text-[#ECEFF3] placeholder-[#8791A3]/50 focus:outline-none focus:border-[#C9A15A] transition-colors disabled:opacity-50`}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-rose-400">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#C9A15A] hover:bg-[#B88E45] disabled:opacity-75 disabled:cursor-not-allowed text-[#0A0F1A] font-semibold text-sm rounded-lg shadow-lg hover:shadow-[#C9A15A]/20 transition-all duration-150 active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0A0F1A]" />
                <span>Sending Reset Token...</span>
              </>
            ) : (
              <span>Send Reset Token</span>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center text-xs text-[#8791A3] hover:text-[#ECEFF3] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
