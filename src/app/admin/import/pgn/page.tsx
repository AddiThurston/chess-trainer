import { AdminDenied } from "@/components/admin-denied";
import { adminUser } from "@/lib/api";
import { PgnImportForm } from "@/components/pgn-import-form";

export default async function PgnImportPage() {
  if (!(await adminUser())) return <AdminDenied />;
  return <PgnImportForm />;
}
