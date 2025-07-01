import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const BLOCKED_DOMAINS = ['example.com', 'test.com'];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const isValidEmail = (email: string) => {
    const domain = email.split('@')[1];
    if (!domain) return false;
    if (BLOCKED_DOMAINS.includes(domain.toLowerCase())) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              full_name: '',
              avatar_url: '',
            },
          },
        });
        
        if (signUpError) throw signUpError;

        if (data?.user?.confirmed_at) {
          await signIn(email, password);
          navigate('/');
          toast.success('Registration successful! You are now logged in.');
        } else {
          toast.success('Registration successful! Please check your email to confirm your account.');
          setIsRegistering(false);
        }
      } else {
        await signIn(email, password);
        navigate('/');
        toast.success('Successfully logged in');
      }
    } catch (error: any) {
      console.error('Error:', error);
      if (error.message.includes('Email not confirmed')) {
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email,
        });
        
        if (resendError) {
          toast.error('Failed to resend confirmation email. Please try again.');
        } else {
          toast.error('Please check your email to confirm your account. A new confirmation email has been sent.');
        }
      } else {
        toast.error(error.message || (isRegistering ? 'Failed to register' : 'Failed to sign in'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 to-primary-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-primary-50 tracking-tight font-serif">HAPO RADIO</h1>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-primary-50">
            {isRegistering ? 'Create an account' : 'Sign in to your account'}
          </h2>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-primary-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-primary-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-200">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-primary-600 rounded-md shadow-sm placeholder-primary-400 bg-primary-700 text-primary-50 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-200">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-primary-600 rounded-md shadow-sm placeholder-primary-400 bg-primary-700 text-primary-50 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              {isRegistering && (
                <p className="mt-2 text-sm text-primary-400">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>

            <div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-900 bg-primary-50 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (isRegistering ? 'Registering...' : 'Signing in...') : (isRegistering ? 'Register' : 'Sign in')}
              </motion.button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}