'use client';

interface PriorityModalProps {
  showClearPriorityConfirm: boolean;
  setShowClearPriorityConfirm: () => void;
  clearAllPriorities: () => void;
  setShowDialog: (value: string | null) => void;
}

export default function PriorityModal({
  showClearPriorityConfirm,
  setShowClearPriorityConfirm,
  clearAllPriorities,
//   setShowDialog,
}: PriorityModalProps) {
  return (
    <>
      {showClearPriorityConfirm && (
        <div className="fixed inset-0 bg-gray-400/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md mx-auto">
            <h3 className="text-lg font-bold mb-4">Clear All Priorities?</h3>
            <p className="mb-6">Are you sure you want to clear all priority values? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowClearPriorityConfirm()}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={clearAllPriorities}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}