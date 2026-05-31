import { useEffect } from "react";
import { X, CheckCircle, XCircle, Info } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { clsx } from "clsx";

const icons = {
  success: <CheckCircle className="h-4 w-4 text-green-400" />,
  error: <XCircle className="h-4 w-4 text-red-400" />,
  info: <Info className="h-4 w-4 text-blue-400" />,
};

function ToastItem({ id, type, message }: { id: string; type: "success" | "error" | "info"; message: string }) {
  const remove = useAppStore((s) => s.removeToast);

  useEffect(() => {
    const t = setTimeout(() => remove(id), type === "error" ? 8000 : 4000);
    return () => clearTimeout(t);
  }, [id, type, remove]);

  return (
    <div
      className={clsx(
        "flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[280px] max-w-sm",
        "bg-slate-800 border-slate-700",
        "animate-[fadeInUp_0.2s_ease-out]"
      )}
    >
      {icons[type]}
      <p className="flex-1 text-sm text-slate-200 leading-snug">{message}</p>
      <button
        onClick={() => remove(id)}
        className="text-slate-500 hover:text-slate-300 mt-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
