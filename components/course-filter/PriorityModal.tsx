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
        <div className="fixed inset-0 bg-scrim/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface text-ink p-6 rounded-panel shadow-float max-w-md mx-auto border border-rule">
            <h3 className="text-lead font-bold mb-4">Clear all priorities?</h3>
            <p className="mb-6 text-body text-ink-2">Are you sure you want to clear all priority values? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowClearPriorityConfirm()}
                className="px-4 py-2 bg-rule-soft text-ink rounded-control hover:bg-rule transition-colors duration-150 ease-spring cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={clearAllPriorities}
                className="px-4 py-2 bg-bad text-accent-ink rounded-control hover:shadow-hover transition-shadow duration-150 ease-spring cursor-pointer"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
