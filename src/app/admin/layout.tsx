import { AdminNav } from "@/components/admin-nav";
import { adminUser } from "@/lib/api";

export const dynamic = "force-dynamic";

// Pages render in parallel with this layout, so each admin page checks the user itself before it reads anything.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await adminUser();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
      {admin ? <AdminNav /> : null}
      {children}
    </div>
  );
}
