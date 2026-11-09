import { HorizontalNav, Sidebar, TopNav } from "@/app/components/chrome";
import { InactivityLogout } from "@/app/components/inactivity-logout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-black">
      <InactivityLogout />
      <TopNav />
      <HorizontalNav />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
