"use client";

import { useState, useEffect, useCallback } from "react";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import Link from "next/link";

export default function SignIn() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const createSession = useCallback(async (idToken: string) => {
    try {
      const response = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        window.location.href = "/dashboard";
        return true;
      } else {
        const data = await response.json();
        console.error("Session API error:", response.status, data);
        setError(data.error || "Failed to create session. Please try again.");
        return false;
      }
    } catch (err) {
      console.error("Session creation error:", err);
      setError("Network error. Please check your connection.");
    }
    return false;
  }, []);

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          window.location.href = "/dashboard";
          return true;
        }
      } catch {
        // No valid session
      }
      return false;
    };

    checkExistingSession().then((hasSession) => {
      if (!hasSession) {
        setLoading(false);
      }
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const idToken = await result.user.getIdToken();
        const success = await createSession(idToken);
        if (!success) {
          // Error already set by createSession
          setSubmitting(false);
        }
      }
    } catch (err: unknown) {
      console.error("Sign in error:", err);
      setSubmitting(false);
      
      if (err instanceof Error) {
        const errorMessage = err.message;
        if (errorMessage.includes("popup-closed-by-user")) {
          setError("Sign-in was cancelled. Please try again.");
        } else if (errorMessage.includes("popup-blocked")) {
          setError("Popup was blocked. Please allow popups for this site.");
        } else {
          setError("Sign-in failed. Please try again.");
        }
      } else {
        setError("Sign-in failed. Please try again.");
      }
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user) {
        const idToken = await result.user.getIdToken();
        const success = await createSession(idToken);
        if (!success) {
          // Error already set by createSession
          setSubmitting(false);
        }
      }
    } catch (err: unknown) {
      console.error("Email sign in error:", err);
      setSubmitting(false);
      
      if (err instanceof Error) {
        const errorMessage = err.message;
        if (errorMessage.includes("user-not-found")) {
          setError("No account found with this email. Please sign up first.");
        } else if (errorMessage.includes("wrong-password") || errorMessage.includes("invalid-credential")) {
          setError("Incorrect password. Please try again.");
        } else if (errorMessage.includes("invalid-email")) {
          setError("Invalid email address.");
        } else if (errorMessage.includes("too-many-requests")) {
          setError("Too many failed attempts. Please try again later.");
        } else {
          setError("Sign-in failed. Please check your credentials.");
        }
      } else {
        setError("Sign-in failed. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 px-4 py-8">
      {/* Back to Home Link */}
      <div className="w-full max-w-md mb-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md">
        <div className="w-full">
          {/* Login Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Login</h2>
              <p className="text-gray-500 text-sm sm:text-base">Welcome back! Please login to your account</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-6">
              {/* Username/Email Field */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-100 border-0 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="User name"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-100 border-0 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="Password"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" 
                  />
                  <span className="text-sm text-gray-600">Remember Me</span>
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  Forgot Password ?
                </Link>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-lg py-4 px-4 font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Logging in...
                  </span>
                ) : (
                  "LOGIN"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400">Or login with</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Social Login */}
            <div className="flex justify-center gap-4">
              {/* Google */}
              <button
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:border-gray-300 hover:shadow-md transition-all disabled:opacity-50"
              >
                <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-gray-500 text-sm mt-8">
              New User?{" "}
              <Link href="/auth/signup" className="text-purple-600 hover:text-purple-700 font-semibold">
                Signup
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}