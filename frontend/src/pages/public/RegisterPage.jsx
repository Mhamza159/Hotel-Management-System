import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import AuthSplitLayout from '../../layouts/AuthSplitLayout';
import { authService } from '../../services/auth.service';
import { KeycardLoader } from '../../components/common/KeycardLoader';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().min(1, 'Phone number is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least 1 number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      setServerError('');
      setIsSubmitting(true);

      const { name, email, phone, password } = data;
      await authService.register({ name, email, phone, password });

      // Automatically routed to guest portal upon registration
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Registration failure:', err);
      setServerError(
        err.message || 'Unable to complete registration. Please check your information.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const termsFooter = (
    <p className="text-[11px] text-[#2A2A28]/60 leading-relaxed max-w-[360px] mx-auto">
      By creating an account, you agree to our{' '}
      <Link to="/terms" className="text-[#2B3A2A] font-medium hover:underline">
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link to="/privacy" className="text-[#2B3A2A] font-medium hover:underline">
        Privacy Policy
      </Link>
      .
    </p>
  );

  return (
    <AuthSplitLayout
      headlinePart1="Join us,"
      headlinePart2="differently."
      title="Create Your Account"
      subtitle="Join Grand Horizon for boutique comfort and memorable moments."
      footerContent={termsFooter}
    >
      {serverError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{serverError}</span>
        </div>
      )}

      {isSubmitting && (
        <div className="mb-4">
          <KeycardLoader message="Creating your guest profile & securing credentials..." />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {/* Full Name */}
        <div>
          <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
            Full Name <span className="text-[#2B3A2A]">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#2B3A2A] absolute left-3.5 top-3" />
            <input
              type="text"
              disabled={isSubmitting}
              {...register('name')}
              placeholder="Ex. John Doe"
              className={`w-full bg-[#FAF8F2] border ${
                errors.name ? 'border-rose-400' : 'border-[#E4DFD0]'
              } rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#2A2A28] placeholder-[#2A2A28]/45 focus:outline-none focus:border-[#2B3A2A] transition-colors disabled:opacity-50`}
            />
          </div>
          {errors.name && (
            <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
          )}
        </div>

        {/* Email Address */}
        <div>
          <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
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

        {/* Phone Number */}
        <div>
          <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
            Phone Number <span className="text-[#2B3A2A]">*</span>
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-[#2B3A2A] absolute left-3.5 top-3" />
            <input
              type="tel"
              disabled={isSubmitting}
              {...register('phone')}
              placeholder="+1 (555) 000-0000"
              className={`w-full bg-[#FAF8F2] border ${
                errors.phone ? 'border-rose-400' : 'border-[#E4DFD0]'
              } rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#2A2A28] placeholder-[#2A2A28]/45 focus:outline-none focus:border-[#2B3A2A] transition-colors disabled:opacity-50`}
            />
          </div>
          {errors.phone && (
            <p className="mt-1 text-xs text-rose-600">{errors.phone.message}</p>
          )}
        </div>

        {/* Password & Confirm Password — SIDE BY SIDE in 2 Columns */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
                Password <span className="text-[#2B3A2A]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#2B3A2A] absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  disabled={isSubmitting}
                  {...register('password')}
                  placeholder="••••••••"
                  className={`w-full bg-[#FAF8F2] border ${
                    errors.password ? 'border-rose-400' : 'border-[#E4DFD0]'
                  } rounded-xl pl-10 pr-9 py-2.5 text-xs text-[#2A2A28] placeholder-[#2A2A28]/45 focus:outline-none focus:border-[#2B3A2A] transition-colors disabled:opacity-50`}
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#2A2A28]/60 hover:text-[#2A2A28] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
                Confirm Password <span className="text-[#2B3A2A]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#2B3A2A] absolute left-3.5 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  disabled={isSubmitting}
                  {...register('confirmPassword')}
                  placeholder="••••••••"
                  className={`w-full bg-[#FAF8F2] border ${
                    errors.confirmPassword ? 'border-rose-400' : 'border-[#E4DFD0]'
                  } rounded-xl pl-10 pr-9 py-2.5 text-xs text-[#2A2A28] placeholder-[#2A2A28]/45 focus:outline-none focus:border-[#2B3A2A] transition-colors disabled:opacity-50`}
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#2A2A28]/60 hover:text-[#2A2A28] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Password Validation Errors */}
          {errors.password && (
            <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
          )}
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword.message}</p>
          )}

          {/* Requested Password Helper Text */}
          <p className="text-[11px] text-[#2A2A28]/60 mt-1.5 leading-snug">
            Password must be at least 8 characters, including a number and a special character.
          </p>
        </div>

        {/* Primary CTA Button: Solid Forest */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 bg-[#2B3A2A] hover:bg-[#1F2B20] disabled:opacity-75 disabled:cursor-not-allowed text-[#F5F1E8] font-sans font-semibold text-xs uppercase tracking-[0.14em] rounded-[8px] transition-all shadow-sm active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#F5F1E8]" />
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>

        {/* Link back to login */}
        <div className="text-center pt-2">
          <span className="text-xs text-[#2A2A28]/70">Already have an account? </span>
          <Link
            to="/login"
            className="text-xs font-semibold text-[#2B3A2A] hover:underline transition-colors ml-1"
          >
            Sign In
          </Link>
        </div>
      </form>
    </AuthSplitLayout>
  );
};

export default RegisterPage;
