import { AdminDenied } from "@/components/admin-denied";
import { adminUser } from "@/lib/api";
import { notFound } from "next/navigation";
import { ImportProgress } from "@/components/import-progress";
import { getJob } from "@/lib/imports";

export default async function ImportJobPage({ params }: PageProps<"/admin/import/[id]">) {
  if (!(await adminUser())) return <AdminDenied />;
  const { id } = await params;
  const job = Number.isInteger(Number(id)) ? await getJob(Number(id)) : null;
  if (!job) notFound();
  return <ImportProgress job={job} />;
}
