import { AdminDenied } from "@/components/admin-denied";
import { adminUser } from "@/lib/api";
import { ChapterPicker } from "@/components/chapter-picker";
import { listChapters } from "@/lib/imports";

export default async function ChaptersPage() {
  if (!(await adminUser())) return <AdminDenied />;
  return <ChapterPicker chapters={await listChapters()} />;
}
