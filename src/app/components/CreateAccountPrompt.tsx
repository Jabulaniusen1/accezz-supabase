"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { BsX, BsCheckCircle, BsPersonPlus } from '@/icon-adapters/react-icons/bs';

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
    <div className="fixed bottom-4 right-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-[320px] p-4 animate-fadeIn">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <div className="w-9 h-9 bg-[#f54502]/10 rounded-full flex items-center justify-center">
              <BsCheckCircle className="w-5 h-5 text-[#f54502]" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Save your tickets
              </h3>
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <BsX size={18} />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Create an account to access tickets anytime from your dashboard.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={handleCreateAccount}
                className="w-full px-3 py-2 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white rounded-md text-sm font-medium hover:from-[#f54502]/90 hover:to-[#d63a02]/90 transition-colors flex items-center justify-center gap-2"
              >
                <BsPersonPlus className="w-4 h-4" />
                Create account
              </button>
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSignIn}
                  className="text-xs text-[#f54502] hover:underline font-medium"
                >
                  Sign in instead
                </button>
                <button
                  onClick={handleLinkAccount}
                  disabled={isLinking}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-60"
                >
                  {isLinking ? "Linking…" : "I’m signed in — link order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

