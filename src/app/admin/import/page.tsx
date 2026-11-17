import { AdminDenied } from "@/components/admin-denied";
import { adminUser } from "@/lib/api";
import Link from "next/link";
import { BulkImportForm } from "@/components/bulk-import-form";
import { listJobs } from "@/lib/imports";

export default async function ImportPage() {
  if (!(await adminUser())) return <AdminDenied />;
  const jobs = await listJobs();
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <BulkImportForm />
      <aside className="flex flex-col gap-6">
        <section>
          <h2 className="font-heading text-lg font-bold">Recent imports</h2>
          {jobs.length ? (
            <ul className="mt-2 flex flex-col gap-1">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/admin/import/${job.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 hover:bg-card">
                    <span>{job.createdAt}</span>
                    <span className="text-sm text-muted-foreground">
                      {job.open ? `${job.total - job.open} of ${job.total} done` : `${job.total} tasks, finished`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Nothing has been imported from Lichess yet.</p>
          )}
        </section>
        <section>
          <h2 className="font-heading text-lg font-bold">Have a PGN file instead?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A file becomes one course straight away, without the title or opening filters.
          </p>
          <Link href="/admin/import/pgn" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
            Import a PGN file
          </Link>
        </section>
      </aside>
    </div>
  );
}
