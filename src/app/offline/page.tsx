export default function Offline() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          You&apos;re offline
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Please check your internet connection and try again.
        </p>
      </div>
    </div>
  );
}