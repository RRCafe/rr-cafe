interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  hideCancel?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
  hideCancel = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onCancel}></div>
      <div className="relative glass-card rounded-3xl max-w-sm w-full p-6 animate-scale-in border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <h3 className="text-xl font-serif font-bold text-white mb-3 tracking-wide">{title}</h3>
        <p className="text-white/70 mb-8 leading-relaxed font-light">{message}</p>
        
        <div className="flex gap-3 justify-end">
          {!hideCancel && (
            <button
              onClick={onCancel}
              className="px-5 py-2.5 font-bold text-xs uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 font-bold text-xs uppercase tracking-widest text-white rounded-xl transition-all duration-300 shadow-lg ${
              isDestructive ? 'bg-red-600/80 hover:bg-red-600 border border-red-500/50 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-blue-600/80 hover:bg-blue-600 border border-blue-500/50 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
