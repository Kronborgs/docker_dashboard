import { Header } from "./Header";
import { ToastContainer } from "../ui/Toast";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Header />
      <main className="max-w-[1600px] mx-auto px-6 py-6">{children}</main>
      <ToastContainer />
    </div>
  );
}
