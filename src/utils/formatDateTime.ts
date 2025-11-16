// utils/formatDateTime.ts
export const formatEventTime = (timeString: string): string => {
  if (!timeString) return '';

  // Check if the time is already in AM/PM format (like "5:00 PM")
  const ampmMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    // Return the properly formatted time (capitalize AM/PM)
    const hours = ampmMatch[1].padStart(2, '0');
    const minutes = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase();
    return `${hours}:${minutes} ${period}`;
  }

  // Handle 24-hour format (like "17:00")
  const [hoursStr, minutesStr = '00'] = timeString.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) return '';

  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const formatEventDate = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

export const formatDateTime = (startTime: string, endTime?: string | null): string => {
  if (!startTime) return '';
  
  const start = new Date(startTime);
  if (isNaN(start.getTime())) return '';

  const startDate = start.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const startTimeFormatted = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (!endTime) {
    return `${startDate} at ${startTimeFormatted}`;
  }

  const end = new Date(endTime);
  if (isNaN(end.getTime())) {
    return `${startDate} at ${startTimeFormatted}`;
  }

  const endDate = end.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const endTimeFormatted = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // If same day, show date once
  if (startDate === endDate) {
    return `${startDate} from ${startTimeFormatted} to ${endTimeFormatted}`;
  }

  // Different days
  return `${startDate} at ${startTimeFormatted} - ${endDate} at ${endTimeFormatted}`;
};