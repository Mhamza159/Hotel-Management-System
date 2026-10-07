import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import AuthSplitLayout from '../../layouts/AuthSplitLayout';
import { authService } from '../../services/auth.service';
import { KeycardLoader } from '../../components/common/KeycardLoader';
import { ROLES } from '../../config/constants';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      setServerError('');
      setIsSubmitting(true);

      const response = await authService.login(data);
      const user = response.user;

      // Smart redirection based on role or intended destination
      const from = location.state?.from?.pathname;

      const isPathAllowedForRole = (path, role) => {
        if (!path || path === '/login') return false;
        if (role === ROLES.SUPER_ADMIN) return true;
        if (path.startsWith('/admin')) {
          if (path.startsWith('/admin/bookings') || path.startsWith('/admin/copilot')) {
            return [ROLES.RECEPTIONIST, ROLES.SUPER_ADMIN].includes(role);
          }
          return false;
        }
        if (path.startsWith('/desk')) {
          return [ROLES.RECEPTIONIST, ROLES.SUPER_ADMIN].includes(role);
        }
        if (path.startsWith('/housekeeping')) {
          return [ROLES.HOUSEKEEPING, ROLES.RECEPTIONIST, ROLES.SUPER_ADMIN].includes(role);
        }
        // Guest or public routes
        return true;
      };

      if (from && isPathAllowedForRole(from, user.role)) {
        navigate(from, { replace: true });
        return;
      }

      switch (user.role) {
        case ROLES.RECEPTIONIST:
          navigate('/desk', { replace: true });
          break;
        case ROLES.HOUSEKEEPING:
          navigate('/housekeeping', { replace: true });
          break;
        case ROLES.SUPER_ADMIN:
          navigate('/admin/staff', { replace: true });
          break;
        default:
          navigate('/dashboard', { replace: true });
          break;
      }
    } catch (err) {
      console.error('Login failure:', err);
      setServerError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      headlinePart1="Welcome back."
      headlinePart2="to your sanctuary."
      title="Sign In"
      subtitle="Welcome back to Grand Horizon. Sign in to manage your stay."
    >
      {serverError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{serverError}</span>
        </div>
      )}

      {isSubmitting && (
        <div className="mb-4">
          <KeycardLoader message="Verifying credentials & authenticating session..." />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="text-xs font-semibold text-[#2A2A28] block mb-1.5">
            Email Address <span className="text-[#2B3A2A]">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#2B3A2A] absolute left-3.5 top-3" />
            <input
              type="email"
              disabled={isSubmitting}
              {...register('email')}
              placeholder="guest@example.com"
              className={`w-full bg-[#FAF8F2] border ${
                errors.email ? 'border-rose-400' : 'border-[#E4DFD0]'
              } rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#2A2A28] placeholder-[#2A2A28]/45 focus:outline-none focus:border-[#2B3A2A] transition-colors disabled:opacity-50`}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[#2A2A28] block">
              Password <span className="text-[#2B3A2A]">*</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-[#2B3A2A] hover:underline transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#2B3A2A] absolute left-3.5 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              disabled={isSubmitting}
              {...register('password')}
              placeholder="••••••••"
              className={`w-full bg-[#FAF8F2] border ${
                errors.password ? 'border-rose-400' : 'border-[#E4DFD0]'
              } rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#2A2A28] placeholder-[#2A2A28]/45 focus:outline-none focus:border-[#2B3A2A] transition-colors disabled:opacity-50`}
            />
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#2A2A28]/60 hover:text-[#2A2A28] transition-colors cursor-pointer disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
          )}
        </div>

        {/* Primary CTA Button: Solid Forest */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-[#2B3A2A] hover:bg-[#1F2B20] disabled:opacity-75 disabled:cursor-not-allowed text-[#F5F1E8] font-sans font-semibold text-xs uppercase tracking-[0.14em] rounded-[8px] transition-all shadow-sm active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer mt-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#F5F1E8]" />
              <span>Signing In...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>

        {/* Register Link */}
        <div className="text-center pt-3">
          <span className="text-xs text-[#2A2A28]/70">Don't have an account? </span>
          <Link
            to="/register"
            className="text-xs font-semibold text-[#2B3A2A] hover:underline transition-colors ml-1"
          >
            Register
          </Link>
        </div>
      </form>
    </AuthSplitLayout>
  );
};

export default LoginPage;
