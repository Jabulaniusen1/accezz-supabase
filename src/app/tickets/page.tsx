// "use client";

// import React, { useState } from 'react';
// import TicketTypeForm from '../components/TicketTypeForm';
// import Image from 'next/image';

// // Mock event data
// const eventsData = [
//   {
//     id: 1,
//     title: 'Tech Conference',
//     date: '2024-12-01',
//     location: 'New York',
//     price: 5000,
//     attendees: [
//       { id: 'a1', name: 'Alice', ticketType: 'VIP', scanned: false },
//       { id: 'a2', name: 'Bob', ticketType: 'General', scanned: true },
//       { id: 'a3', name: 'Charlie', ticketType: 'Student', scanned: false },
//     ],
//     ticketTypes: ['VIP', 'General', 'Student'],
//   },
//   {
//     id: 2,
//     title: 'Music Fest',
//     date: '2024-12-15',
//     location: 'Los Angeles',
//     price: 8000,
//     attendees: [
//       { id: 'm1', name: 'Megan', ticketType: 'VIP', scanned: true },
//       { id: 'm2', name: 'David', ticketType: 'Student', scanned: false },
//     ],
//     ticketTypes: ['VIP', 'General', 'Student'],
//   },
// ];

// const Ticket = () => {
//   const [showForm, setShowForm] = useState(false);

//   const event = eventsData.find((event) => event.id === 1);

//   if (!event) {
//     return <p>Event not found!</p>;
//   }

//   const handleGetTicket = () => {
//     setShowForm(true);
//   };

//   const closeForm = () => {
//     setShowForm(false);
//   };

//   return (
//     <div className="flex flex-col min-h-screen bg-yellow-50 relative overflow-hidden">

//       <header className="w-full bg-transparent p-4 shadow-md relative z-10">
//         <div className="flex items-center">
//           <Image src="/logo.svg" alt="Logo" width={40} height={40} />
//           <h1 className="ml-2 text-xl font-bold text-gray-800">{event.title}</h1>
//         </div>
//       </header>

//       <div className="absolute inset-0 grid grid-cols-12 gap-2 opacity-20">
//         {[...Array(12)].map((_, i) => (
//           <div key={i} className="bg-gray-900 h-full"></div>
//         ))}
//       </div>
   

//       {/* Main Content */}
//       <main className="flex flex-col items-center justify-center p-6 text-center relative z-10">
//         <h2 className="text-lg font-semibold text-gray-500">Don’t miss out!</h2>
//         <h1 className="text-3xl font-extrabold text-gray-900 mb-6">
//           {event.title}
//         </h1>
//         <p className="text-sm text-gray-600 mb-6">
//           <strong>Date:</strong> {event.date} | <strong>Location:</strong>{' '}
//           {event.location}
//         </p>

//         {/* Ticket Boxes */}
//         <div className="flex flex-wrap justify-center gap-6">
//           {event.ticketTypes.map((ticketType, index) => (
//             <div
//               key={index}
//               className={`ticket-box p-4 rounded-xl shadow-lg flex flex-col justify-between items-center ${
//                 index === 0
//                   ? 'bg-blue-500'
//                   : index === 1
//                   ? 'bg-green-500'
//                   : 'bg-red-500'
//               } text-white`}
//               style={{ width: '200px', height: '120px' }}
//             >
//               <p className="font-semibold">{ticketType} Ticket</p>
//               <p className="text-xs">
//                 Price: <strong>₦{event.price}</strong>
//               </p>
//             </div>
//           ))}
//         </div>

//         <button
//           onClick={handleGetTicket}
//           className="mt-8 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none"
//         >
//           Get Ticket
//         </button>
//       </main>

//       {showForm && <TicketTypeForm closeForm={closeForm} />}
//     </div>
//   );
// };

// export default Ticket;


import React from 'react'

function Ticket() {
  return (
    <div>Ticket</div>
  )
}

export default Ticket