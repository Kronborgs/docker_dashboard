import { X, CheckCircle, XCircle } from "lucide-react";
import type { UpdateResult } from "../../types";
import { Button } from "../ui/Button";

interface UpdateResultModalProps {
  result: UpdateResult | null;
  onClose: () => void;
}

export function UpdateResultModal({ result, onClose }: UpdateResultModalProps) {
  if (!result) return null;

  const success = result.status === "success" || result.status === "dry_run";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          {success ? (
            <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
          ) : (
            <XCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
          )}
          <h3 className="font-semibold text-slate-100">
            {result.dry_run
              ? "Dry Run Result"
              : success
              ? "Update Successful"
              : "Update Failed"}
          </h3>
        </div>

        <div className="space-y-1.5 bg-slate-900 rounded-lg p-3 max-h-64 overflow-auto">
          {result.steps.map((step, i) => (
            <p key={i} className="text-sm font-mono text-slate-300">
              {step}
            </p>
          ))}
        </div>

        {result.message && (
          <p className="mt-3 text-sm text-slate-400">{result.message}</p>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
