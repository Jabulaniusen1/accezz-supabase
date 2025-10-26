import React, { useEffect, useState } from 'react';
import SuccessModal from './modal/successModal';

type NotificationSettings = {
  ticketSales?: boolean;
  attendeeReminders?: boolean;
  eventUpdates?: boolean;
  ticketPurchase?: boolean;
  eventReminders?: boolean;
};

const Notifications = () => {
  const [showModal, setShowModal] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState<NotificationSettings>({
    ticketPurchase: true,
    eventReminders: true,
    eventUpdates: false,
  });

  const [smsNotifications, setSmsNotifications] = useState<NotificationSettings>({
    ticketPurchase: true,
    eventReminders: true,
    eventUpdates: false,
  });

  const [hostNotifications, setHostNotifications] = useState<NotificationSettings>({
    ticketSales: false,
    attendeeReminders: false,
    eventUpdates: false,
  });

  // const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedEmailNotifications = localStorage.getItem('emailNotifications');
    const savedSmsNotifications = localStorage.getItem('smsNotifications');
    const savedHostNotifications = localStorage.getItem('hostNotifications');

    if (savedEmailNotifications) {
      setEmailNotifications(JSON.parse(savedEmailNotifications));
    }
    if (savedSmsNotifications) {
      setSmsNotifications(JSON.parse(savedSmsNotifications));
    }
    if (savedHostNotifications) {
      setHostNotifications(JSON.parse(savedHostNotifications));
    }
  }, []);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setNotifications: React.Dispatch<React.SetStateAction<NotificationSettings>>,
    notifications: NotificationSettings
  ) => {
    const { name, checked } = event.target;
    setNotifications({
      ...notifications,
      [name]: checked,
    });
  };

  const saveSettings = () => {
    localStorage.setItem('emailNotifications', JSON.stringify(emailNotifications));
    localStorage.setItem('smsNotifications', JSON.stringify(smsNotifications));
    localStorage.setItem('hostNotifications', JSON.stringify(hostNotifications));
    setShowModal(true); 
  };


  const sections = [
    {
      title: 'Email Notifications',
      description: 'Choose which events you want to be notified about via email.',
      settings: emailNotifications,
      setSettings: setEmailNotifications,
      notificationTypes: ['ticketPurchase', 'eventReminders', 'eventUpdates'],
    },
    {
      title: 'SMS Notifications',
      description: 'Choose which events you want to be notified about via SMS.',
      settings: smsNotifications,
      setSettings: setSmsNotifications,
      notificationTypes: ['ticketPurchase', 'eventReminders', 'eventUpdates'],
    },
    {
      title: 'Host Notifications',
      description:
        'Enable notifications for ticket sales and attendee reminders for event organizers.',
      settings: hostNotifications,
      setSettings: setHostNotifications,
      notificationTypes: ['ticketSales', 'attendeeReminders', 'eventUpdates'],
    },
  ];

  return (
    <div className="flex flex-col items-start justify-start p-6 bg-gray-100 dark:bg-gray-900 h-full">
      <h1 className="text-2xl font-bold mb-4 dark:text-white">Notification Settings</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Manage your notification preferences. Choose how you would like to stay updated on ticketing events and notifications.
      </p>

      {sections.map((section) => (
        <div
          key={section.title}
          className="w-full max-w-lg bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8"
        >
          <h2 className="text-lg font-semibold mb-4 dark:text-white">{section.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{section.description}</p>
          <div className="space-y-4">
            {section.notificationTypes.map((notificationType) => (
              <div className="flex justify-between items-center py-2" key={notificationType}>
                <label className="text-sm font-medium dark:text-gray-300 capitalize">
                  {notificationType.replace(/([A-Z])/g, ' $1')}
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name={notificationType}
                    checked={section.settings[notificationType as keyof NotificationSettings]}
                    onChange={(e) => handleChange(e, section.setSettings, section.settings)}
                    className="sr-only peer"
                  />
                  <div
                    className={`w-12 h-6 bg-gray-400 peer-focus:ring-2 peer-focus:ring-[#f54502]/50 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-[#f54502] peer-checked:to-[#d63a02] transition-all duration-300`}
                  ></div>
                  <div
                    className={`absolute w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-300 translate-x-0 peer-checked:translate-x-6`}
                  ></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={saveSettings}
        className="w-full bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white py-3 px-6 rounded-lg hover:from-[#f54502]/90 hover:to-[#d63a02]/90 focus:ring-2 focus:ring-[#f54502]/50 focus:outline-none transition-all duration-200 transform hover:scale-105"
      >
        Save Notification Settings
      </button>
{/* 
      {notificationMessage && (
        <div className="mt-4 bg-green-500 text-white p-3 rounded-lg shadow-md">
          {notificationMessage}
        </div>
      )} */}

      {showModal && (
        <SuccessModal
          title="Settings Saved"
          message="Your Notification settings have been successfully updated."
          onClose={() => setShowModal(false)} 
        />
      )}

    </div>
  );
};

export default Notifications;
