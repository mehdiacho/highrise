import { declareBankrupt } from '../local/actions.js';

interface Props {
  onClose: () => void;
}

export default function BankruptConfirm({ onClose }: Props) {
  function handleConfirm() {
    declareBankrupt();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-table-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass w-80 space-y-4 rounded-2xl border border-danger/20 p-6 shadow-panel animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/15 text-lg">
            ⚠️
          </div>
          <h2 className="font-display text-xl font-bold text-danger">Declare Bankruptcy</h2>
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">
          Your properties transfer to your creditor — or are auctioned if you owe the bank.
          This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-semibold text-ink transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-danger py-2 text-sm font-bold text-white transition hover:brightness-110"
          >
            Confirm Bankrupt
          </button>
        </div>
      </div>
    </div>
  );
}
