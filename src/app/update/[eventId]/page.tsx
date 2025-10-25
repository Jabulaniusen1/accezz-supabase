"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { BASE_URL } from "../../../../config";
import { Event } from "../../../types/event";
import Toast from "../../../components/ui/Toast";
import Loader from "@/components/ui/loader/Loader";
import EventHeader from "./components/EventHeader";
import EventImageUpload from "./components/EventImageUpload";
import EventBasicDetails from "./components/EventBasicDetails";
import VirtualEventSettings from "./components/VirtualEventSettings";
import PhysicalEventDetails from "./components/PhysicalEventDetails";
import SocialMediaLinks from "./components/SocialMediaLinks";
import TicketTypesSection from "./components/TicketTypeSection";
import FormActions from "./components/FormActions";

function Update() {
  const [event, setEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<Event | null>(null);
  const { eventId } = useParams<{ eventId: string }>();
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{
    type: "success" | "error";
    message: string;
  }>({
    type: "success",
    message: "",
  });
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const toast = (type: "success" | "error", message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
  };

  useEffect(() => {
    if (eventId) {
      const fetchEvent = async () => {
        try {
          const response = await axios.get(`${BASE_URL}api/v1/events/${eventId}`);
          const eventData = response.data.event;
          setEvent(eventData);
          
          setFormData({
            ...eventData,
            ...(eventData.isVirtual && !eventData.virtualEventDetails && {
              virtualEventDetails: {
                platform: undefined,
                requiresPassword: false,
                virtualPassword: ""
              }
            })
          });
          
          if (eventData.image) {
            setImagePreview(eventData.image);
          }
        } catch (error) {
          const axiosError = error as AxiosError;
          console.error("Error fetching event:", {
            message: axiosError.message,
            stack: axiosError.stack,
            response: axiosError.response?.data || "No response data",
          });
          toast("error", "Failed to load event data");
        }
      };

      fetchEvent();
    }
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData) {
      toast("error", "No event data to update.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast("error", "Authentication token is missing. Please log in.");
        return;
      }

      const updateFormData = new FormData();
      updateFormData.append("title", formData.title);
      updateFormData.append("description", formData.description);
      updateFormData.append("date", new Date(formData.date).toISOString());
      updateFormData.append("ticketType", JSON.stringify(formData.ticketType));
      updateFormData.append("location", formData.location);
      updateFormData.append("venue", formData.venue);
      updateFormData.append("time", formData.time);
      updateFormData.append("isVirtual", String(formData.isVirtual));
      
      if (formData.isVirtual && formData.virtualEventDetails) {
        updateFormData.append("virtualEventDetails", JSON.stringify(formData.virtualEventDetails));
      }

      updateFormData.append(
        "socialMediaLinks",
        JSON.stringify(formData.socialMediaLinks || {})
      );

      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append("file", imageFile);

        await axios.patch(
          `${BASE_URL}api/v1/events/image/${eventId}`,
          imageFormData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      const response = await axios.patch(
        `${BASE_URL}api/v1/events/${eventId}`,
        updateFormData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200 && formData.isVirtual && formData.virtualEventDetails?.platform === 'whereby') {
        try {
          await axios.post(
            `${BASE_URL}api/v1/events/${eventId}/create-whereby-room`,
            {
              enableWaitingRoom: formData.virtualEventDetails.enableWaitingRoom,
              lockRoom: formData.virtualEventDetails.lockRoom
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } catch (wherebyError) {
          console.error("Whereby room creation failed:", wherebyError);
        }
      }

      toast("success", "Event updated successfully!");
      setShouldRedirect(true);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error updating event:", error);
        
        if (error.response?.status === 401) {
          toast("error", "Session expired. Redirecting to login...");
          router.push("/auth/login");
          return;
        }

        const errorMessage = error.response?.data?.message || "Failed to update event";
        toast("error", errorMessage);
      } else {
        console.error("Unexpected error:", error);
        toast("error", "An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const ConfirmationDialog = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl"
      >
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Event Updated Successfully
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          What would you like to do next?
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setShouldRedirect(false);
              setShowToast(false);
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
          >
            Continue Editing
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-12 px-4 sm:px-6">
      <AnimatePresence>
        {showToast && (
          <Toast
            type={toastProps.type}
            message={toastProps.message}
            onClose={() => setShowToast(false)}
          />
        )}
        {shouldRedirect && <ConfirmationDialog />}
      </AnimatePresence>

      <motion.div
        className="w-full sm:max-w-7xl sm:mx-auto mx-full space-y-10 "
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <EventHeader onBack={() => router.push("/dashboard")} />

        

        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-3xl shadow-2xl p-4 sm:p-10 border border-gray-200/50 dark:border-gray-700/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <EventImageUpload 
          imagePreview={imagePreview || (typeof event?.image === "string" ? event.image : undefined)}
          handleImageChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (!file.type.startsWith("image/")) {
                toast("error", "Please upload a valid image file");
                return;
              }
              if (imagePreview) URL.revokeObjectURL(imagePreview);
              setImageFile(file);
              setImagePreview(URL.createObjectURL(file));
            }
          }}
        />
          {event ? (
            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
                <EventBasicDetails 
                  formData={formData}
                  handleInputChange={(e, field) => {
                    if (!formData) return;
                    setFormData({ ...formData, [field]: e.target.value });
                  }}
                />

                <div className="space-y-10">
                  <VirtualEventSettings
                    formData={formData}
                    setFormData={setFormData}
                  />

                  {!formData?.isVirtual && (
                    <PhysicalEventDetails 
                      formData={formData}
                      handleInputChange={(e, field) => {
                        if (!formData) return;
                        setFormData({ ...formData, [field]: e.target.value });
                      }}
                    />
                  )}
                </div>
              </div>

              <SocialMediaLinks 
                formData={formData}
                setFormData={setFormData}
              />

              <TicketTypesSection
                formData={formData}
                setFormData={setFormData}
              />

              <FormActions 
                isLoading={isLoading}
                onCancel={() => router.push("/dashboard")}
              />
            </form>
          ) : (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Update;