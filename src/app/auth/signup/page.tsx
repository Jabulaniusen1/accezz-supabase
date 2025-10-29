"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaPhone,
  FaArrowLeft,
} from "react-icons/fa";
import Loader from "../../../components/ui/loader/Loader";
import Toast from "../../../components/ui/Toast";
import axios from "axios";
import { BASE_URL } from "../../../../config";
import Link from "next/link";

const AgreeTerms = React.lazy(() => import("../../components/home/agreeTerms"));

function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  }>({
    type: "success",
    message: "",
  });

  const toast = (
    type: "success" | "error" | "warning" | "info",
    message: string
  ) => {
    setToastProps({ type, message });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const firstName = formData.get("firstName")?.toString().trim() || "";
      const lastName = formData.get("lastName")?.toString().trim() || "";
      const email = formData.get("email")?.toString().trim() || "";
      const phone = formData.get("phone")?.toString().trim() || "";
      const password = formData.get("password")?.toString().trim() || "";

      if (!firstName || !lastName || !email || !phone || !password) {
        toast("warning", "All fields are required.");
        return;
      }

      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        toast("warning", "Invalid email address.");
        return;
      }

      const signupData = {
        fullName: `${firstName} ${lastName}`,
        email,
        phone,
        password,
        country: "Nigeria", // Backend will detect actual location
        currency: "NG", // Backend will detect actual currency
      };

      const response = await axios.post(
        `${BASE_URL}api/v1/users/register`,
        signupData
      );

      if (response.status === 201 || response.status === 200) {
        localStorage.setItem("userEmail", email);
        localStorage.setItem("user", JSON.stringify({
          ...response.data.user,
          emailVerified: false,
        }));

        if (response.data.token) {
          localStorage.setItem("token", response.data.token);
        }

        toast("success", "Signup successful! Please check your email for verification.");

        setTimeout(() => {
          router.push("/auth/verify-email");
        }, 1500);
      }
    } catch (error: unknown) {
      let errorMessage = "Signup failed. Please try again.";
    
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = error.response.data.message || errorMessage;
        } else if (error.response?.status === 409) {
          errorMessage = "Email already exists. Please use a different email.";
        } else if (error.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        }
      } else if (error instanceof Error && error.message === "Network Error") {
        errorMessage = "Network error! Please check your internet connection.";
      }
    
      toast("error", errorMessage);
    }finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#f54502]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 right-10 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-[#f54502] transition-colors group"
        >
          <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        {/* Loading and Toast */}
        {loading && <Loader />}
        {showToast && (
          <Toast
            type={toastProps.type}
            message={toastProps.message}
            onClose={() => setShowToast(false)}
          />
        )}

        {showTermsPopup && (
          <React.Suspense fallback={<div className="text-black">Loading terms...</div>}>
            <AgreeTerms onClose={() => setShowTermsPopup(false)} />
          </React.Suspense>
        )}

        {/* Form Container */}
        <div className="w-full max-w-md">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#f54502] rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Join Accezz</h1>
            <p className="text-gray-600 text-lg">Create your account and start your journey</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 animate-fadeIn">
            <div className="space-y-6">

              <form onSubmit={handleSignup} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <div className="relative group">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f54502] transition-colors" />
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        placeholder="Femi"
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-transparent text-gray-900 placeholder-gray-400 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <div className="relative group">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f54502] transition-colors" />
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        placeholder="Bode"
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-transparent text-gray-900 placeholder-gray-400 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="relative group">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f54502] transition-colors" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-transparent text-gray-900 placeholder-gray-400 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      required
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <div className="relative group">
                    <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f54502] transition-colors" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="+234 701 121 1312"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-transparent text-gray-900 placeholder-gray-400 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative group">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f54502] transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-transparent text-gray-900 placeholder-gray-400 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#f54502] transition-colors"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-5 h-5 text-[#f54502] bg-white border-gray-300 rounded focus:ring-[#f54502] focus:ring-2"
                  />
                  <label htmlFor="agreeTerms" className="text-sm text-gray-600">
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsPopup(true)}
                      className="text-[#f54502] underline hover:text-[#f54502]/80 font-medium"
                    >
                      Terms and Conditions
                    </button>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!agreeTerms || loading}
                  className={`w-full px-6 py-4 flex items-center justify-center rounded-2xl font-semibold text-lg transition-all duration-300 transform
                  ${
                    !agreeTerms || loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white shadow-lg hover:shadow-xl hover:scale-105"
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Creating Account...
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              <div className="text-center">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="text-[#f54502] hover:underline font-semibold transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;