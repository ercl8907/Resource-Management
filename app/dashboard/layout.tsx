import { HorizontalNav, Sidebar, TopNav } from "@/app/components/chrome";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <TopNav />
      <HorizontalNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 sm:p-10">{children}</main>
      </div>
    </div>
  );
}
