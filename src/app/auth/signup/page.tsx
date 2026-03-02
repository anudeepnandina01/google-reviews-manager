"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import Link from "next/link";

export default function SignUp() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
    if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
    if (score <= 4) return { score, label: "Strong", color: "bg-emerald-500" };
    return { score, label: "Very Strong", color: "bg-emerald-400" };
  }, [password]);

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
        sessionStorage.setItem("trigger-tour", "1");
        window.location.href = "/home";
        return true;
      }
    } catch (err) {
      console.error("Session creation error:", err);
    }
    return false;
  }, []);

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          window.location.href = "/home";
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
          setError("Failed to create session. Please try again.");
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

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Please enter your name.");
      setSubmitting(false);
      return;
    }

    if (!email || !password) {
      setError("Please enter both email and password.");
      setSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    try {
      // Create user with email and password
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      if (result.user) {
        await updateProfile(result.user, { displayName: name });
        
        // Get fresh token after profile update
        const idToken = await result.user.getIdToken(true);
        const success = await createSession(idToken);
        if (!success) {
          setError("Account created but failed to sign in. Please try signing in.");
          setSubmitting(false);
        }
      }
    } catch (err: unknown) {
      console.error("Sign up error:", err);
      setSubmitting(false);
      
      if (err instanceof Error) {
        const errorMessage = err.message;
        if (errorMessage.includes("email-already-in-use")) {
          setError("An account with this email already exists. Please sign in instead.");
        } else if (errorMessage.includes("invalid-email")) {
          setError("Invalid email address.");
        } else if (errorMessage.includes("weak-password")) {
          setError("Password is too weak. Please use a stronger password.");
        } else {
          setError("Sign-up failed. Please try again.");
        }
      } else {
        setError("Sign-up failed. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Purple Gradient with Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-32 left-16 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-16 w-56 h-56 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-purple-400/20 rounded-full blur-lg"></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12">
          {/* Illustration - New user signup concept */}
          <div className="mb-8">
            <svg className="w-80 h-80 flex-shrink-0" width="320" height="320" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Background card */}
              <rect x="100" y="100" width="200" height="200" rx="20" fill="white" fillOpacity="0.95"/>
              
              {/* Form elements inside card */}
              <rect x="130" y="140" width="140" height="16" rx="8" fill="#E9D5FF"/>
              <rect x="130" y="170" width="140" height="16" rx="8" fill="#E9D5FF"/>
              <rect x="130" y="200" width="140" height="16" rx="8" fill="#E9D5FF"/>
              <rect x="150" y="235" width="100" height="30" rx="15" fill="#8B5CF6"/>
              <text x="175" y="255" fill="white" fontSize="12" fontWeight="bold">Sign Up</text>
              
              {/* Person celebrating - on the right */}
              <circle cx="320" cy="160" r="30" fill="#FCD34D"/>
              <circle cx="320" cy="160" r="26" fill="#FBBF24"/>
              {/* Hair */}
              <path d="M294 150 Q320 120 346 150 Q346 135 320 130 Q294 135 294 150" fill="#1F2937"/>
              {/* Face */}
              <circle cx="310" cy="158" r="3" fill="#1F2937"/>
              <circle cx="330" cy="158" r="3" fill="#1F2937"/>
              <path d="M312 170 Q320 178 328 170" stroke="#1F2937" strokeWidth="2" fill="none" strokeLinecap="round"/>
              
              {/* Body */}
              <path d="M290 280 L320 200 L350 280" fill="#7C3AED"/>
              
              {/* Arms raised in celebration */}
              <path d="M295 220 L270 170" stroke="#FBBF24" strokeWidth="14" strokeLinecap="round"/>
              <path d="M345 220 L370 170" stroke="#FBBF24" strokeWidth="14" strokeLinecap="round"/>
              
              {/* Hands */}
              <circle cx="268" cy="165" r="10" fill="#FBBF24"/>
              <circle cx="372" cy="165" r="10" fill="#FBBF24"/>
              
              {/* Confetti / celebration elements */}
              <circle cx="250" cy="140" r="6" fill="#F472B6"/>
              <circle cx="390" cy="150" r="5" fill="#34D399"/>
              <circle cx="270" cy="200" r="4" fill="#60A5FA"/>
              <circle cx="380" cy="200" r="6" fill="#FBBF24"/>
              <rect x="255" y="170" width="12" height="4" rx="2" fill="#A78BFA" transform="rotate(30 255 170)"/>
              <rect x="375" cy="180" width="10" height="4" rx="2" fill="#F472B6" transform="rotate(-20 375 180)"/>
              
              {/* Stars */}
              <path d="M240 120 L243 128 L252 128 L245 133 L248 141 L240 136 L232 141 L235 133 L228 128 L237 128 Z" fill="#FCD34D"/>
              <path d="M385 130 L387 136 L394 136 L389 140 L391 146 L385 142 L379 146 L381 140 L376 136 L383 136 Z" fill="#FCD34D"/>
              
              {/* Small decorative elements */}
              <circle cx="60" cy="150" r="5" fill="white" fillOpacity="0.3"/>
              <circle cx="80" cy="250" r="8" fill="white" fillOpacity="0.2"/>
              <path d="M50 200 L65 200 M57.5 192.5 L57.5 207.5" stroke="white" strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-white text-center mb-4">
            Join ReviewFlow Today
          </h1>
          <p className="text-white/80 text-center max-w-sm">
            Create your account and start managing reviews with AI-powered responses
          </p>
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-gray-50 p-4 sm:p-6 lg:p-12 overflow-y-auto">
        {/* Back to Home Link - Mobile */}
        <div className="w-full max-w-md mb-4 lg:hidden">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <svg className="w-7 h-7 text-white flex-shrink-0" width="28" height="28" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-800">ReviewFlow</span>
          </div>

          {/* Sign Up Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8 lg:p-10">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Account</h2>
              <p className="text-gray-500">Start your free trial today</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="John Doe"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
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
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Create a password"
                    disabled={submitting}
                  />
                </div>
                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${passwordStrength.color} transition-all duration-300`} 
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.score <= 1 ? 'text-red-500' :
                        passwordStrength.score <= 2 ? 'text-orange-500' :
                        passwordStrength.score <= 3 ? 'text-yellow-500' :
                        'text-emerald-500'
                      }`}>{passwordStrength.label}</span>
                    </div>
                    <p className="text-gray-400 text-xs">Use 8+ chars with uppercase, numbers & symbols</p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-12 pr-10 py-3 bg-gray-50 border rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                      confirmPassword && password !== confirmPassword ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="Confirm your password"
                    disabled={submitting}
                  />
                  {confirmPassword && password === confirmPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords don&apos;t match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || (password !== confirmPassword && confirmPassword !== "")}
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl py-4 px-4 font-semibold transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400">or continue with</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Google Sign Up */}
            <button
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl py-3.5 px-4 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {submitting ? "Connecting..." : "Google"}
            </button>

            {/* Sign In Link */}
            <p className="text-center text-gray-500 text-sm mt-6">
              Already have an account?{" "}
              <Link href="/auth/signin" className="text-purple-600 hover:text-purple-700 font-semibold transition">
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-xs mt-6">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
