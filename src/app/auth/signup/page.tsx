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
} from "react-icons/fa";
import Loader from "../../../components/ui/loader/Loader";
import Toast from "../../../components/ui/Toast";
import axios from "axios";
import { BASE_URL } from "../../../../config";
import Link from "next/link";
import Image from "next/image";

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
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center  p-4 sm:p-8">
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

        {/* Form Content */}
        <div className="w-full max-w-md rounded-2xl  animate-fadeIn p-6 sm:p-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-black">Join V-Tickets</h1>
              <p className="text-gray-500">Start managing and booking events</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm  text-gray-500">
                    First Name
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" />
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      placeholder="Femi"
                      className="w-full pl-10 pr-4 py-2.5  border rounded-xl font-light focus:outline-none focus:ring-2 focus:ring-[#f54502] text-black placeholder-[#f54502]/50"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm  text-gray-500">
                    Last Name
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" />
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      placeholder="Bode"
                      className="w-full pl-10 pr-4 py-2.5  border rounded-xl font-light focus:outline-none focus:ring-2 focus:ring-[#f54502] text-black placeholder-[#f54502]/50"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm  text-gray-500">
                  Email Address
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5  border rounded-xl font-light focus:outline-none focus:ring-2 focus:ring-blue-400 text-black placeholder-blue-200/50"
                    required
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm  text-gray-500">
                  Phone Number
                </label>
                <div className="relative">
                  <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="+234 701 121 1312"
                    className="w-full pl-10 pr-4 py-2.5  border rounded-xl font-light focus:outline-none focus:ring-2 focus:ring-blue-400 text-black placeholder-blue-200/50"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm  text-gray-500">
                  Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2.5  border rounded-xl font-light focus:outline-none focus:ring-2 focus:ring-[#f54502] text-black placeholder-[#f54502]/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-200 hover:text-black transition-colors"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 text-[#f54502] bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-[#f54502] dark:focus:ring-[#f54502]"
                />
                <label htmlFor="agreeTerms" className="text-sm text-gray-500 dark:text-gray-300">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsPopup(true)}
                    className="text-black dark:text-[#f54502] underline hover:text-[#f54502] dark:hover:text-[#f54502]/80"
                  >
                    Terms and Conditions
                  </button>
                </label>
              </div>

              <button
                type="submit"
                disabled={!agreeTerms}
                className={`w-full px-5 py-3 flex items-center justify-center rounded-xl text-white text-sm font-medium 
                transition-all duration-300 bg-[#f54502] hover:bg-[#f54502]/90
                ${
                  agreeTerms
                    ? "  transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                    : "  opacity-50 cursor-not-allowed"
                }`}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
            </form>

            <p className="text-center text-gray-500">
              Already have an account?{" "}
              <Link
                href="/auth/login?verify==false"
                className="text-[#f54502] hover:underline font-medium"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f54502]/20 to-[#d63a02]/20 dark:from-gray-900/40 dark:to-[#f54502]/40 z-10"></div>
        <Image
          src="/images/vtickets hero.jpg"
          alt="Event Management"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/30 dark:bg-black/50 z-20"></div>
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="text-center text-gray-100 p-8">
            <h2 className="text-4xl font-bold mb-4">Welcome to V-Tickets</h2>
            <p className="text-xl text-gray-300 max-w-md">
              Your gateway to seamless event management and ticket booking
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;