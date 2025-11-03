import { FaUserPlus, FaTrash } from "react-icons/fa";
import { Event } from "../../../../types/event";

interface AttendeesListProps {
  ticketIndex: number;
  formData: Event | null;
  setFormData: React.Dispatch<React.SetStateAction<Event | null>>;
}

export default function AttendeesList({ 
  ticketIndex, 
  formData, 
  setFormData 
}: AttendeesListProps) {
  const handleAttendeeChange = (
    attendeeIndex: number,
    field: "name" | "email",
    value: string
  ) => {
    if (!formData) return;

    const updatedTickets = [...formData.ticketType];
    const ticket = updatedTickets[ticketIndex];

    if (!ticket.attendees) {
      ticket.attendees = [];
    }

    if (!ticket.attendees[attendeeIndex]) {
      ticket.attendees[attendeeIndex] = { name: "", email: "" };
    }

    ticket.attendees[attendeeIndex] = {
      ...ticket.attendees[attendeeIndex],
      [field]: value,
    };

    setFormData({
      ...formData,
      ticketType: updatedTickets,
    });
  };

  const handleAddAttendee = () => {
    if (!formData) return;

    const updatedTickets = [...formData.ticketType];
    const ticket = updatedTickets[ticketIndex];

    if (!ticket.attendees) {
      ticket.attendees = [];
    }

    ticket.attendees.push({ name: "", email: "" });

    setFormData({
      ...formData,
      ticketType: updatedTickets,
    });
  };

  const handleRemoveAttendee = (attendeeIndex: number) => {
    if (!formData) return;

    const updatedTickets = [...formData.ticketType];
    const ticket = updatedTickets[ticketIndex];

    if (!ticket.attendees) return;

    ticket.attendees = ticket.attendees.filter(
      (_, index) => index !== attendeeIndex
    );

    setFormData({
      ...formData,
      ticketType: updatedTickets,
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-3 sm:mb-4">
        <h4 className="text-base sm:text-lg font-medium text-gray-800 dark:text-white">
          Pre-registered Attendees
        </h4>
        <button
          type="button"
          onClick={handleAddAttendee}
          className="flex items-center space-x-1 sm:space-x-2 text-[#f54502] hover:text-[#d63a02]
               dark:text-[#f54502] dark:hover:text-[#d63a02] text-xs sm:text-sm"
        >
          <FaUserPlus size={14} />
          <span>Add Attendee</span>
        </button>
      </div>
      <div className="space-y-2 sm:space-y-3">
        {formData?.ticketType[ticketIndex]?.attendees?.map((attendee, attendeeIndex) => (
          <div key={attendeeIndex} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
              <input
                type="text"
                value={attendee.name}
                onChange={(e) => handleAttendeeChange(attendeeIndex, "name", e.target.value)}
                className="px-3 sm:px-4 py-2 rounded-[5px] border border-gray-300 dark:border-gray-600
                     focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base"
                placeholder="Attendee Name"
              />
              <input
                type="email"
                value={attendee.email}
                onChange={(e) => handleAttendeeChange(attendeeIndex, "email", e.target.value)}
                className="px-3 sm:px-4 py-2 rounded-[5px] border border-gray-300 dark:border-gray-600
                     focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base"
                placeholder="Attendee Email"
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveAttendee(attendeeIndex)}
              className="text-[#f54502] hover:text-[#d63a02] dark:hover:text-[#d63a02] self-end sm:self-auto"
            >
              <FaTrash size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}