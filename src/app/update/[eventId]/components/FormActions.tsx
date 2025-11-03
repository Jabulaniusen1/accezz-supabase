interface FormActionsProps {
  isLoading: boolean;
  onCancel: () => void;
}

const FormActions = ({ isLoading, onCancel }: FormActionsProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t dark:border-gray-700">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 sm:px-6 py-2 rounded-[5px] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm sm:text-base w-full sm:w-auto"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className={`px-4 sm:px-6 py-2 rounded-[5px] bg-[#f54502] text-white hover:bg-[#d63a02] transition-colors text-sm sm:text-base w-full sm:w-auto
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
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