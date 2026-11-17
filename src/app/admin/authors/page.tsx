import { AdminDenied } from "@/components/admin-denied";
import { adminUser } from "@/lib/api";
import { AuthorList } from "@/components/author-list";
import { listAuthors } from "@/lib/imports";

export default async function AuthorsPage() {
  if (!(await adminUser())) return <AdminDenied />;
  return <AuthorList authors={await listAuthors()} />;
}
