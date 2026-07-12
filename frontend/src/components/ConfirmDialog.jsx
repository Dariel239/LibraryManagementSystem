export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" role="dialog" aria-modal="true">
      <div className="bg-surface rounded-xl border border-border w-full max-w-sm p-6">
        <h2 className="font-display text-lg font-semibold text-primary mb-2">{title}</h2>
        <p className="text-sm text-muted mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-border text-primary font-medium py-2 rounded-md hover:bg-black/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-md transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
