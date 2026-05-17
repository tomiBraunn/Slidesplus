// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const errorParam = searchParams.get('error');

        if (errorParam) {
          setError(`Authentication failed with ${errorParam}. Please try again.`);
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        // Get the current session from Supabase (handles both hash and query params)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setError('No authentication session found');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        // Session exists; store access token in localStorage for legacy backend calls if needed
        localStorage.setItem('token', session.access_token);

        // Redirect to home
        navigate('/home');
      } catch (err: any) {
        setError('Unexpected error during authentication');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="mb-4">
            <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
          <p className="text-gray-400">{error}</p>
          <p className="text-gray-500 text-sm mt-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <div className="mb-4 animate-spin">
          <span className="material-symbols-outlined text-blue-500 text-6xl">progress_activity</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Logging you in...</h1>
        <p className="text-gray-400">Please wait</p>
      </div>
    </div>
  );
}
