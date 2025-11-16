"use client";

import React, { useState, useRef, useEffect } from "react";
import { FaChevronDown, FaSearch } from "react-icons/fa";

interface SearchableSelectProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  icon,
  className = "",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredOptions(options);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredOptions(
        options.filter(
          (option) =>
            option.label.toLowerCase().includes(query) ||
            option.value.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Value Display */}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f54502] transition-colors z-10 pointer-events-none">
            {icon}
          </div>
        )}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full ${icon ? 'pl-9 sm:pl-12' : 'pl-3 sm:pl-4'} pr-8 sm:pr-10 py-2 sm:py-3 border border-gray-200 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-transparent text-sm sm:text-base text-gray-900 bg-white/50 text-left flex items-center justify-between ${
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:border-gray-300"
          }`}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <FaChevronDown
            className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0 transition-transform ${
              isOpen ? "transform rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[5px] shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f54502] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              No results found
            </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    value === option.value
                      ? "bg-[#f54502]/10 text-[#f54502] font-medium"
                      : "text-gray-900 dark:text-gray-200"
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

