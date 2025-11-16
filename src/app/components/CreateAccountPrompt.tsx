"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { BsX, BsCheckCircle, BsPersonPlus } from "react-icons/bs";

interface CreateAccountPromptProps {
  isOpen: boolean;
  onClose: () => void;
  buyerEmail: string;
  orderId: string;
}

export default function CreateAccountPrompt({
  isOpen,
  onClose,
  buyerEmail,
  orderId,
}: CreateAccountPromptProps) {
  const router = useRouter();
  const [isLinking, setIsLinking] = useState(false);

  if (!isOpen) return null;

  const handleCreateAccount = () => {
    // Navigate to signup with email pre-filled
    const params = new URLSearchParams({
      email: buyerEmail,
      orderId: orderId,
      redirect: "/dashboard",
    });
    router.push(`/auth/signup?${params.toString()}`);
  };

  const handleSignIn = () => {
    // Navigate to login with email pre-filled
    const params = new URLSearchParams({
      email: buyerEmail,
      orderId: orderId,
      redirect: "/dashboard",
    });
    router.push(`/auth/login?${params.toString()}`);
  };

  const handleLinkAccount = async () => {
    try {
      setIsLinking(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If no session, redirect to login with orderId
        const params = new URLSearchParams({
          email: buyerEmail,
          orderId: orderId,
          redirect: "/dashboard",
        });
        router.push(`/auth/login?${params.toString()}`);
        return;
      }

      // Link the order to the current user
      const { error } = await supabase
        .from("orders")
        .update({ buyer_user_id: session.user.id })
        .eq("id", orderId)
        .is("buyer_user_id", null); // Only update if buyer_user_id is null

      if (error) {
        console.error("Error linking account:", error);
        // Still show success, the order might already be linked
      }

      onClose();
      router.push("/dashboard");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLinking(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <BsX size={24} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-[#f54502]/10 rounded-full flex items-center justify-center">
            <BsCheckCircle className="w-8 h-8 text-[#f54502]" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Ticket Purchased Successfully! 🎉
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create an account to save your tickets and access them anytime from your dashboard.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Benefits:</strong> View all your tickets in one place, get event updates, and never lose your tickets!
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleCreateAccount}
            className="w-full px-6 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white rounded-lg font-semibold hover:from-[#f54502]/90 hover:to-[#d63a02]/90 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <BsPersonPlus size={20} />
            Create Account
          </button>

          <button
            onClick={handleSignIn}
            className="w-full px-6 py-3 border-2 border-[#f54502] text-[#f54502] rounded-lg font-semibold hover:bg-[#f54502]/10 transition-all"
          >
            Sign In (Already have an account?)
          </button>

          <button
            onClick={handleLinkAccount}
            disabled={isLinking}
            className="w-full px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-sm"
          >
            {isLinking ? "Linking..." : "I'm already signed in - Link my tickets"}
          </button>

          <button
            onClick={handleSkip}
            className="w-full px-6 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

