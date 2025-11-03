'use client';
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaChevronLeft, 
  FaChevronRight, 
  FaTimes,
  FaCheck
} from 'react-icons/fa';

interface DateTimePickerProps {
  type: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  className?: string;
}

const formatTime12Hour = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const DateTimePicker = memo(({ 
  type, 
  value, 
  onChange, 
  minDate, 
  className = '' 
}: DateTimePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hour, setHour] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);
  const [isAm, setIsAm] = useState<boolean>(true);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Initialize values from props
  useEffect(() => {
    if (value) {
      if (type === 'date') {
        const dateParts = value.split('-').map(Number);
        const localDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        setSelectedDate(localDate);
        setCurrentMonth(new Date(dateParts[0], dateParts[1] - 1, 1));
      } else {
        const [hours, minutes] = value.split(':').map(Number);
        setHour(hours % 12 || 12);
        setMinute(minutes);
        setIsAm(hours < 12);
      }
    }
  }, [value, type]);

  // Optimized click outside handler using useCallback
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  // Scroll to selected time with cleanup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isOpen && type === 'time') {
      timeoutId = setTimeout(() => {
        if (hoursRef.current) {
          const hourElement = hoursRef.current.querySelector(`[data-hour="${hour}"]`);
          hourElement?.scrollIntoView({ block: 'center' });
        }
        if (minutesRef.current) {
          const minuteElement = minutesRef.current.querySelector(`[data-minute="${minute}"]`);
          minuteElement?.scrollIntoView({ block: 'center' });
        }
      }, 50);
    }
    return () => clearTimeout(timeoutId);
  }, [isOpen, type, hour, minute]);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    onChange(formattedDate);
    setIsOpen(false);
  }, [onChange]);

  const handleTimeConfirm = useCallback(() => {
    const hours = isAm ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
    const timeString = `${hours.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(timeString);
    setIsOpen(false);
  }, [hour, minute, isAm, onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    if (type === 'date') {
      setSelectedDate(null);
    } else {
      setHour(12);
      setMinute(0);
      setIsAm(true);
    }
    setIsOpen(false);
  }, [onChange, type]);

  const renderCalendar = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      const isDisabled = minDate && new Date(minDate) > new Date(year, month, i + 1);
      const isSelected = selectedDate && 
                         dayDate.getFullYear() === selectedDate.getFullYear() &&
                         dayDate.getMonth() === selectedDate.getMonth() &&
                         dayDate.getDate() === selectedDate.getDate();
      
      days.push(
        <button
          key={`day-${i}`}
          onClick={() => !isDisabled && handleDateSelect(dayDate)}
          disabled={!!isDisabled}
          className={`w-8 h-8 rounded-[5px] flex items-center justify-center text-sm
            ${isSelected ? 'bg-[#f54502] text-white' : ''}
            ${isDisabled ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 
              'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'}
            transition-colors duration-150
          `}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center px-2">
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <FaChevronLeft size={14} />
          </button>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <FaChevronRight size={14} />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
            <div key={day} className="text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  }, [currentMonth, minDate, selectedDate, handleDateSelect]);

  const renderTimePicker = useCallback(() => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
      <div className="space-y-4">
        <div className="flex justify-center space-x-4">
          <div className="flex flex-col items-center w-16">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hours</div>
            <div 
              ref={hoursRef}
              className="h-48 overflow-y-auto scrollbar-hide border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              {hours.map((h) => (
                <button
                  key={`hour-${h}`}
                  data-hour={h}
                  onClick={() => setHour(h)}
                  className={`w-full py-2 text-center ${
                    hour === h
                      ? 'bg-[#f54502]/10 dark:bg-[#f54502]/20 text-[#f54502] dark:text-[#f54502] font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {h.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center w-16">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Minutes</div>
            <div 
              ref={minutesRef}
              className="h-48 overflow-y-auto scrollbar-hide border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              {minutes.map((m) => (
                <button
                  key={`minute-${m}`}
                  data-minute={m}
                  onClick={() => setMinute(m)}
                  className={`w-full py-2 text-center ${
                    minute === m
                      ? 'bg-[#f54502]/10 dark:bg-[#f54502]/20 text-[#f54502] dark:text-[#f54502] font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {m.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center ml-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">AM/PM</div>
            <div className="flex flex-col space-y-2 h-48 justify-center">
              <button 
                onClick={() => setIsAm(true)}
                className={`px-4 py-3 rounded-[5px] ${
                  isAm ? 'bg-[#f54502] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                AM
              </button>
              <button 
                onClick={() => setIsAm(false)}
                className={`px-4 py-3 rounded-[5px] ${
                  !isAm ? 'bg-[#f54502] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                PM
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between pt-4">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-[5px] hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Clear
          </button>
          <button
            onClick={handleTimeConfirm}
            className="px-4 py-2 bg-[#f54502] text-white rounded-[5px] hover:bg-[#d63a02] flex items-center space-x-2"
          >
            <FaCheck size={14} />
            <span>Confirm</span>
          </button>
        </div>
      </div>
    );
  }, [hour, minute, isAm, handleClear, handleTimeConfirm]);

  const displayValue = useCallback(() => {
    if (!value) return type === 'date' ? 'Select date' : 'Select time';
    
    if (type === 'date') {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return formatTime12Hour(value);
  }, [value, type]);

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border ${
          isOpen 
            ? 'border-[#f54502] ring-2 ring-[#f54502]/20 dark:ring-[#f54502]/30' 
            : 'border-gray-300 dark:border-gray-600'
        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex items-center justify-between transition-all duration-200 text-sm sm:text-base`}
      >
        <span className="text-left">{displayValue()}</span>
        <div className="flex items-center space-x-2">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full"
            >
              <FaTimes size={14} />
            </button>
          )}
          {type === 'date' ? (
            <FaCalendarAlt className="text-gray-500 dark:text-gray-400" />
          ) : (
            <FaClock className="text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-20 mt-1 w-full min-w-[280px] bg-white dark:bg-gray-800 rounded-[5px] shadow-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-800 dark:text-gray-200">
                {type === 'date' ? 'Select Date' : 'Select Time'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-full"
              >
                <FaTimes size={16} />
              </button>
            </div>
            
            {type === 'date' ? renderCalendar() : renderTimePicker()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

DateTimePicker.displayName = 'DateTimePicker';

export default DateTimePicker;