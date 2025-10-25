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
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white">
          Pre-registered Attendees
        </h4>
        <button
          type="button"
          onClick={handleAddAttendee}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700
               dark:text-blue-400 dark:hover:text-blue-300"
        >
          <FaUserPlus />
          <span>Add Attendee</span>
        </button>
      </div>
      <div className="space-y-3">
        {formData?.ticketType[ticketIndex]?.attendees?.map((attendee, attendeeIndex) => (
          <div key={attendeeIndex} className="flex items-center space-x-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={attendee.name}
                onChange={(e) => handleAttendeeChange(attendeeIndex, "name", e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Attendee Name"
              />
              <input
                type="email"
                value={attendee.email}
                onChange={(e) => handleAttendeeChange(attendeeIndex, "email", e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Attendee Email"
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveAttendee(attendeeIndex)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <FaTrash />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}