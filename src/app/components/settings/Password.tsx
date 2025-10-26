import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Toast from "../../../components/ui/Toast";
import { BASE_URL } from "../../../../config";
import Link from "next/link";

const Password = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "error" | "success" | "warning" | "info";
    message: string;
  }>({ type: "error", message: "" });

  const toast = (type: "success" | "error", message: string) => {
    setToastMessage({ type, message });
    setShowToast(true);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate password match
    if (newPassword !== confirmPassword) {
      toast("error", "New password and confirm password do not match");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!token) {
        toast("error", "Please login to change your password");
        router.push("/auth/login");
        return;
      }

      const response = await axios.patch(
        `${BASE_URL}api/v1/users/change-password`,
        {
          email: user.email,
          previousPassword: currentPassword,
          newPassword: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        toast("success", "Password updated successfully!");
        // Clear form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          toast("error", "Current password is incorrect");
        } else if (error.response?.status === 401) {
          toast("error", "Session expired. Please login again");
          router.push("/auth/login");
        } else {
          toast(
            "error",
            error.response?.data?.message || "Failed to update password"
          );
        }
      } else {
        toast("error", "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start justify-start p-4 sm:p-2 dark:bg-gray-900 h-full">
      {showToast && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => setShowToast(false)}
        />
      )}

      <h1 className="text-2xl font-bold mb-4 dark:text-white">
        Password Settings
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Manage your password settings. Ensure your account is secure by keeping
        your password updated and enabling extra security measures.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">
            Change Password
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 mt-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-colors"
                placeholder="Enter current password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-gray-300">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 mt-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-colors"
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-gray-300">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 mt-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-colors"
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full ${
                loading ? "bg-[#f54502]/70" : "bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90"
              } text-white py-3 px-6 rounded-lg focus:ring-2 focus:ring-[#f54502]/50 focus:outline-none flex items-center justify-center transition-all duration-200 transform hover:scale-105`}
            >
              {loading ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2" />
              ) : null}
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* ============== && •TWO-FACTOR AUTHENTICATION• && ================= */}
        <div className="w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">
            Two-Factor Authentication
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enable two-factor authentication (2FA) for an extra layer of
            security. You&apos;ll need to enter a code sent to your mobile
            device in addition to your password.
          </p>
          <a href="auth/twoFacAuth" target="_blank" rel="noopener noreferrer">
            <button className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 focus:ring-2 focus:ring-green-400 focus:outline-none transition-all duration-200 transform hover:scale-105">
              Set Up Two-Factor Authentication
            </button>
          </a>
        </div>

        {/* ============== && •PASSWORD RECOVERY SECTION• && ================= */}
        <div className="col-span-1 md:col-span-2 w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">
            Password Recovery
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Forgot your password? Use the recovery option to reset it.
          </p>
          <Link href="/auth/forgot-password">
            <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-6 rounded-lg hover:from-yellow-600 hover:to-yellow-700 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition-all duration-200 transform hover:scale-105">
              Send Recovery Email
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Password;
