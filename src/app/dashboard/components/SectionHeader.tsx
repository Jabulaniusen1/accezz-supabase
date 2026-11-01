import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
}

/**
 * The one header every dashboard section uses. On mobile the title is already
 * shown in the top bar, so only the description is shown here.
 */
export default function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="hidden md:block text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 md:mt-1">{description}</p>
      )}
    </div>
  );
}
