import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaIdCard, FaTags } from "react-icons/fa";
import DateTimePicker from "@/components/ui/DateTimePicker";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { supabase } from "@/utils/supabaseClient";
import { Event } from "../../../../types/event";

type EventCategory = {
  id: string;
  name: string;
};

const toDateInputValue = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const toTimeInputValue = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(11, 16);
};

const combineDateAndTime = (date: string, time: string): string => {
  if (!date) return "";
  const safeTime = time || "00:00";
  const combined = new Date(`${date}T${safeTime}`);
  if (Number.isNaN(combined.getTime())) return "";
  return combined.toISOString();
};

interface EventBasicDetailsProps {
  formData: Event | null;
  setFormData: React.Dispatch<React.SetStateAction<Event | null>>;
  notify: (type: "error" | "success", message: string) => void;
}

export default function EventBasicDetails({
  formData,
  setFormData,
  notify,
}: EventBasicDetailsProps) {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categorySelectValue, setCategorySelectValue] = useState<string>("");
  const [customCategoryInput, setCustomCategoryInput] = useState<string>("");
  const [showEndTime, setShowEndTime] = useState<boolean>(Boolean(formData?.endTime));

  useEffect(() => {
    setCategorySelectValue(
      formData?.categoryId ?? (formData?.categoryCustom ? "__custom__" : "")
    );
    setCustomCategoryInput(formData?.categoryCustom ?? "");
  }, [formData?.categoryId, formData?.categoryCustom]);

  useEffect(() => {
    setShowEndTime(Boolean(formData?.endTime));
  }, [formData?.endTime]);

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const { data, error } = await supabase
          .from("event_categories")
          .select("id, name")
          .order("name", { ascending: true });
        if (error) throw error;
        if (isMounted && data) {
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
        notify("error", "Unable to load event categories right now.");
      } finally {
        if (isMounted) setCategoriesLoading(false);
      }
    };
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, [notify]);

  const updateForm = useCallback(
    (changes: Partial<Event>) => {
      setFormData((prev) => (prev ? { ...prev, ...changes } : prev));
    },
    [setFormData]
  );

  const startTimeIso = useMemo(
    () =>
      formData?.startTime ||
      (formData?.date ? combineDateAndTime(formData.date, formData.time || "") : ""),
    [formData?.startTime, formData?.date, formData?.time]
  );

  const startDateValue = useMemo(
    () => formData?.date || toDateInputValue(startTimeIso),
    [formData?.date, startTimeIso]
  );

  const startTimeValue = useMemo(
    () => formData?.time || toTimeInputValue(startTimeIso),
    [formData?.time, startTimeIso]
  );

  const endDateValue = useMemo(
    () => (formData?.endTime ? toDateInputValue(formData.endTime) : startDateValue),
    [formData?.endTime, startDateValue]
  );

  const endTimeValue = useMemo(
    () => (formData?.endTime ? toTimeInputValue(formData.endTime) : ""),
    [formData?.endTime]
  );

  const categoryOptions = useMemo(
    () => [
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
      { value: "__custom__", label: "Other (add my own)" },
    ],
    [categories]
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      setCategorySelectValue(value);
      if (value === "__custom__") {
        updateForm({
          categoryId: undefined,
          categoryName: undefined,
          categoryCustom: customCategoryInput.trim(),
        });
        return;
      }
      const selected = categories.find((category) => category.id === value);
      updateForm({
        categoryId: value,
        categoryName: selected?.name,
        categoryCustom: "",
      });
    },
    [categories, customCategoryInput, updateForm]
  );

  const handleCustomCategoryChange = useCallback(
    (value: string) => {
      setCustomCategoryInput(value);
      if (categorySelectValue === "__custom__") {
        updateForm({
          categoryId: undefined,
          categoryName: undefined,
          categoryCustom: value,
        });
      }
    },
    [categorySelectValue, updateForm]
  );

  const handleStartDateChange = useCallback(
    (value: string) => {
      if (!value) {
        updateForm({ date: "", startTime: "", endTime: null });
        setShowEndTime(false);
        return;
      }
      const newStartIso = combineDateAndTime(value, startTimeValue || "09:00");
      if (!newStartIso) {
        notify("error", "Invalid start date selected.");
        return;
      }
      updateForm({
        date: value,
        startTime: newStartIso,
      });
      if (showEndTime) {
        const currentEnd = formData?.endTime
          ? new Date(formData.endTime).getTime()
          : Number.NaN;
        const newStart = new Date(newStartIso).getTime();
        if (!Number.isNaN(currentEnd) && currentEnd > newStart) {
          return;
        }
        const adjustedEnd = new Date(newStartIso);
        adjustedEnd.setHours(adjustedEnd.getHours() + 1);
        updateForm({ endTime: adjustedEnd.toISOString() });
      }
    },
    [formData?.endTime, notify, showEndTime, startTimeValue, updateForm]
  );

  const handleStartTimeChange = useCallback(
    (value: string) => {
      if (!startDateValue) {
        notify("error", "Select a date before choosing a time.");
        return;
      }
      const newStartIso = combineDateAndTime(startDateValue, value);
      if (!newStartIso) {
        notify("error", "Invalid start time selected.");
        return;
      }
      updateForm({
        time: value,
        startTime: newStartIso,
      });
      if (showEndTime) {
        const currentEnd = formData?.endTime
          ? new Date(formData.endTime).getTime()
          : Number.NaN;
        const newStart = new Date(newStartIso).getTime();
        if (!Number.isNaN(currentEnd) && currentEnd > newStart) {
          return;
        }
        const adjustedEnd = new Date(newStartIso);
        adjustedEnd.setHours(adjustedEnd.getHours() + 1);
        updateForm({ endTime: adjustedEnd.toISOString() });
      }
    },
    [formData?.endTime, notify, showEndTime, startDateValue, updateForm]
  );

  const handleToggleEndTime = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        if (!startTimeIso) {
          notify("error", "Set the event start time before adding an end time.");
          return;
        }
        const start = new Date(startTimeIso);
        const defaultEnd = new Date(start.getTime() + 60 * 60 * 1000);
        setShowEndTime(true);
        updateForm({ endTime: defaultEnd.toISOString() });
      } else {
        setShowEndTime(false);
        updateForm({ endTime: null });
      }
    },
    [notify, startTimeIso, updateForm]
  );

  const handleEndDateChange = useCallback(
    (value: string) => {
      if (!value) {
        setShowEndTime(false);
        updateForm({ endTime: null });
        return;
      }
      const baseTime = endTimeValue || startTimeValue || "09:00";
      const newEndIso = combineDateAndTime(value, baseTime);
      if (!newEndIso) {
        notify("error", "Invalid end date selected.");
        return;
      }
      if (startTimeIso && new Date(newEndIso).getTime() <= new Date(startTimeIso).getTime()) {
        notify("error", "End time must be after the start time.");
        return;
      }
      setShowEndTime(true);
      updateForm({ endTime: newEndIso });
    },
    [endTimeValue, notify, startTimeIso, startTimeValue, updateForm]
  );

  const handleEndTimeChange = useCallback(
    (value: string) => {
      const baseDate = endDateValue || startDateValue;
      if (!baseDate) {
        notify("error", "Select an end date before choosing a time.");
        return;
      }
      const newEndIso = combineDateAndTime(baseDate, value);
      if (!newEndIso) {
        notify("error", "Invalid end time selected.");
        return;
      }
      if (startTimeIso && new Date(newEndIso).getTime() <= new Date(startTimeIso).getTime()) {
        notify("error", "End time must be after the start time.");
        return;
      }
      setShowEndTime(true);
      updateForm({ endTime: newEndIso });
    },
    [endDateValue, notify, startDateValue, startTimeIso, updateForm]
  );

  if (!formData) {
    return null;
  }

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-[5px] shadow-md border border-gray-100 dark:border-gray-700"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Basic Details</h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Update your event title, schedule, and classification.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Event Title
          </label>
          <input
            type="text"
            value={formData.title || ""}
            onChange={(e) => updateForm({ title: e.target.value })}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f54502] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
            placeholder="Enter event title..."
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Event Description
          </label>
          <textarea
            value={formData.description || ""}
            onChange={(e) => updateForm({ description: e.target.value })}
            rows={4}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f54502] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
            placeholder="Describe your event in detail..."
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Host
          </label>
          <div className="w-full px-4 py-3 rounded-[5px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 flex items-start space-x-3">
            <div className="mt-1 text-[#f54502]">
              <FaIdCard />
            </div>
            <div>
              <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                {formData.hostName || "Your profile name will be used"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Hosts are pulled from the profile connected to this event.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <FaTags className="text-[#f54502]" />
            Category
          </label>
          <SearchableSelect
            options={categoryOptions}
            value={categorySelectValue}
            onChange={handleCategoryChange}
            placeholder={categoriesLoading ? "Loading categories..." : "Select a category"}
            disabled={categoriesLoading}
            className="text-sm"
          />
          {categorySelectValue === "__custom__" && (
            <div className="mt-3">
              <input
                type="text"
                value={customCategoryInput}
                onChange={(e) => handleCustomCategoryChange(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                placeholder="Enter your category"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This custom category applies to this event only.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <DateTimePicker
                type="date"
                value={startDateValue}
                onChange={handleStartDateChange}
                minDate={new Date().toISOString().split("T")[0]}
                className="w-full"
              />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Time
              </label>
              <DateTimePicker
                type="time"
                value={startTimeValue}
                onChange={handleStartTimeChange}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-[5px] border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Add event end time
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Optional, but helps attendees know when to wrap up.
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showEndTime}
                onChange={(e) => handleToggleEndTime(e.target.checked)}
                className="sr-only"
              />
              <span className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 ease-in-out bg-gray-300 dark:bg-gray-600">
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    showEndTime ? "translate-x-5 bg-[#f54502]" : "translate-x-1"
                  }`}
                />
              </span>
            </label>
          </div>

          {showEndTime && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
            >
              <div className="space-y-2 sm:space-y-3">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Date
                </label>
                <DateTimePicker
                  type="date"
                  value={endDateValue}
                  onChange={handleEndDateChange}
                  minDate={startDateValue || new Date().toISOString().split("T")[0]}
                  className="w-full"
                />
              </div>
              <div className="space-y-2 sm:space-y-3">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Time
                </label>
                <DateTimePicker
                  type="time"
                  value={endTimeValue}
                  onChange={handleEndTimeChange}
                  className="w-full"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}