import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { authService } from '../../services/auth.service';
import { KeycardLoader } from '../../components/common/KeycardLoader';

const resetSchema = z
  .object({
    token: z.string().min(10, 'A valid reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least 1 number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: tokenFromUrl,
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      setServerError('');
      setIsSubmitting(true);

      await authService.resetPassword({
        token: data.token,
        password: data.password,
      });

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err) {
      console.error('Password reset failure:', err);
      setServerError(
        err.message || 'Token is invalid, malformed, or has expired. Please request a new link.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create New Password"
      subtitle="Enter your recovery token and define a new secure password"
    >
      {serverError && (
        <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {isSuccess ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-[#ECEFF3]">
            Password Reset Successful!
          </h2>
          <p className="text-xs text-[#8791A3]">
            Your account credentials have been updated. Redirecting you to login...
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-block py-2.5 px-6 bg-[#C9A15A] hover:bg-[#B88E45] text-[#0A0F1A] text-xs font-semibold rounded-lg shadow-md transition-colors"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isSubmitting && (
            <div className="mb-4">
              <KeycardLoader message="Securing your new credentials & updating vault..." />
            </div>
          )}

          {/* Token Input */}
          <div>
            <label className="block text-xs font-semibold text-[#8791A3] uppercase tracking-wider mb-1.5">
              Reset Token
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8791A3]">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="text"
                disabled={isSubmitting}
                {...register('token')}
                placeholder="64-character token from reset email"
                className={`w-full pl-10 pr-4 py-2 bg-[#1B2433] border ${
                  errors.token ? 'border-rose-500' : 'border-[#2A3547]'
                } rounded-lg text-sm text-[#ECEFF3] font-mono placeholder-[#8791A3]/50 focus:outline-none focus:border-[#C9A15A] transition-colors disabled:opacity-50`}
              />
            </div>
            {errors.token && (
              <p className="mt-1 text-xs text-rose-400">{errors.token.message}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-[#8791A3] uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8791A3]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                disabled={isSubmitting}
                {...register('password')}
                placeholder="At least 8 chars, 1 upper, 1 digit"
                className={`w-full pl-10 pr-10 py-2 bg-[#1B2433] border ${
                  errors.password ? 'border-rose-500' : 'border-[#2A3547]'
                } rounded-lg text-sm text-[#ECEFF3] placeholder-[#8791A3]/50 focus:outline-none focus:border-[#C9A15A] transition-colors disabled:opacity-50`}
              />
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8791A3] hover:text-[#ECEFF3] transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-[#8791A3] uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8791A3]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                disabled={isSubmitting}
                {...register('confirmPassword')}
                placeholder="Re-enter your new password"
                className={`w-full pl-10 pr-4 py-2 bg-[#1B2433] border ${
                  errors.confirmPassword ? 'border-rose-500' : 'border-[#2A3547]'
                } rounded-lg text-sm text-[#ECEFF3] placeholder-[#8791A3]/50 focus:outline-none focus:border-[#C9A15A] transition-colors disabled:opacity-50`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-rose-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 bg-[#C9A15A] hover:bg-[#B88E45] disabled:opacity-75 disabled:cursor-not-allowed text-[#0A0F1A] font-semibold text-sm rounded-lg shadow-lg hover:shadow-[#C9A15A]/20 transition-all duration-150 active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0A0F1A]" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs text-[#8791A3] hover:text-[#ECEFF3] transition-colors"
            >
              Remember your password? <span className="text-[#3FD0C9]">Sign In</span>
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPasswordPage;
