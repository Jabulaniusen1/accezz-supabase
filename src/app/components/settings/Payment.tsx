import React, { useState, useEffect } from 'react';
import SuccessModal from './modal/successModal';

type PaymentMethod = {
  bank: string;
  accountNumber: string;
  default: boolean;
};

type Transaction = {
  transactionId: string;
  date: string;
  amount: string;
};

const Payment = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [newMethod, setNewMethod] = useState<PaymentMethod>({
    bank: '',
    accountNumber: '',
    default: false,
  });
  const [preferredCurrency, setPreferredCurrency] = useState<'NGN' | 'NGN'>('NGN');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [revenueHistory, setRevenueHistory] = useState<Transaction[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const saveSettings = () => {
    localStorage.setItem('paymentMethods', JSON.stringify(paymentMethods));
    localStorage.setItem('preferredCurrency', preferredCurrency);
    setShowModal(true);
  };

  useEffect(() => {
    const savedMethods = localStorage.getItem('paymentMethods');
    const savedCurrency = localStorage.getItem('preferredCurrency');

    if (savedMethods) setPaymentMethods(JSON.parse(savedMethods));
    if (savedCurrency) setPreferredCurrency(savedCurrency as 'NGN' | 'NGN');
  }, []);

  useEffect(() => {
    const fakeData: Record<string, Transaction[]> = {
      'Bank1 ****1234': [
        { transactionId: 'TX-1001', date: 'Nov 10, 2024', amount: '₦50,000' },
        { transactionId: 'TX-1002', date: 'Oct 22, 2024', amount: '₦30,000' },
      ],
      'Bank2 ****5678': [
        { transactionId: 'TX-2001', date: 'Nov 15, 2024', amount: '₦40,000' },
        { transactionId: 'TX-2002', date: 'Sep 19, 2024', amount: '₦25,000' },
      ],
    };
    setRevenueHistory(fakeData[selectedAccount || ''] || []);
  }, [selectedAccount]);

  const handleAddPaymentMethod = () => {
    if (!newMethod.bank || !newMethod.accountNumber) {
      setNotification('Please fill in all account details.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (paymentMethods.some((method) => method.accountNumber === newMethod.accountNumber)) {
      setNotification('Account number already exists.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const updatedMethods = [...paymentMethods, { ...newMethod, default: false }];
    setPaymentMethods(updatedMethods);
    setNewMethod({ bank: '', accountNumber: '', default: false });
  };

  const handleSetDefault = (index: number) => {
    const updatedMethods = paymentMethods.map((method, i) => ({
      ...method,
      default: i === index,
    }));
    setPaymentMethods(updatedMethods);
  };

  const handleRemoveMethod = (index: number) => {
    const updatedMethods = paymentMethods.filter((_, i) => i !== index);
    setPaymentMethods(updatedMethods);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white shadow-lg rounded-lg dark:bg-gray-800 dark:text-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-blue-600">Payment Methods</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Preferred Currency
        </label>
        <select
          value={preferredCurrency}
          onChange={(e) => setPreferredCurrency(e.target.value as 'NGN' | 'NGN')}
          className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700"
        >
          <option value="NGN">NGN - Naira</option>
          <option value="NGN">USD - Dollar</option>
        </select>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {paymentMethods.map((method, index) => (
          <div
            key={index}
            className={`relative rounded-xl shadow-lg p-6 text-white ${method.default ? 'bg-blue-600' : 'bg-blue-400'}`}
            style={{
              backgroundImage: `url("https://img.freepik.com/free-vector/gradient-blue-abstract-technology-background_23-2149213765.jpg?t=st=1732732780~exp=1732736380~hmac=9f370098699ccebcb283295a4006bd622b94ae49b303ed8cc251691848e37be9&w=740")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            {method.default && (
              <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                Default
              </span>
            )}
            <p className="text-lg font-semibold">{method.bank}</p>
            <p className="text-sm mt-2">
              Account: ****{method.accountNumber.slice(-4)}
            </p>
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => handleSetDefault(index)}
                className={`text-sm px-3 py-1 rounded-lg ${method.default ? 'bg-green-500 text-white' : 'bg-blue-300 text-blue-800'}`}
              >
                {method.default ? 'Default' : 'Set as Default'}
              </button>
              <button
                onClick={() => handleRemoveMethod(index)}
                className="text-red-500 text-sm hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-10">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">Add New Payment Method</h3>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Bank Name"
            value={newMethod.bank}
            onChange={(e) => setNewMethod({ ...newMethod, bank: e.target.value })}
            className="w-full p-2 border rounded dark:bg-gray-700"
          />
          <input
            type="text"
            placeholder="Account Number"
            value={newMethod.accountNumber}
            onChange={(e) => setNewMethod({ ...newMethod, accountNumber: e.target.value })}
            className="w-full p-2 border rounded dark:bg-gray-700"
          />
            {notification && (
            <div className="mt-4 text-red-600 p-3 rounded-lg shadow-md">
              ❌ {notification}
            </div>
          )}
          <button
            onClick={handleAddPaymentMethod}
            className="bg-blue-500 text-white px-4 py-2 rounded-md shadow hover:bg-blue-600 transition"
          >
            Add Account
          </button>
        </div>
      </div>

      {/* ============== && •REVENUE HISTORY• && ================= */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">Revenue History</h3>
        <select
          onChange={(e) => setSelectedAccount(e.target.value)}
          value={selectedAccount || ''}
          className="w-full p-2 border rounded dark:bg-gray-700 mb-4"
        >
          <option value="">-- Select Account --</option>
          {paymentMethods.map((method) => (
            <option key={method.accountNumber} value={`${method.bank} ****${method.accountNumber.slice(-4)}`}>
              {method.bank} - ****{method.accountNumber.slice(-4)}
            </option>
          ))}
        </select>

        {revenueHistory.length > 0 ? (
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs uppercase bg-blue-100 dark:bg-blue-700">
              <tr>
                <th className="px-6 py-3">Transaction ID</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {revenueHistory.map((transaction, index) => (
                <tr
                  key={index}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                >
                  <td className="px-6 py-4">{transaction.transactionId}</td>
                  <td className="px-6 py-4">{transaction.date}</td>
                  <td className="px-6 py-4">{transaction.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No transactions available for the selected account.</p>
        )}
      </div>

      <button
        onClick={saveSettings}
        className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 transition w-full mt-6"
      >
        Save All Settings
      </button>


      {showModal && (
        <SuccessModal
          title="Settings Saved"
          message="Your payment settings have been successfully updated."
          onClose={() => setShowModal(false)} 
        />
      )}
    </div>
  );
};

export default Payment;
