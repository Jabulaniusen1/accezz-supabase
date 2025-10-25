interface FormActionsProps {
  isLoading: boolean;
  onCancel: () => void;
}

const FormActions = ({ isLoading, onCancel }: FormActionsProps) => {
  return (
    <div className="flex justify-end space-x-4 pt-6 border-t dark:border-gray-700">
      <button
        type="button"
        onClick={onCancel}
        className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className={`px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Updating...</span>
          </div>
        ) : (
          'Update Event'
        )}
      </button>
    </div>
  );
};

export default FormActions;