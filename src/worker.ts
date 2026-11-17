import { query } from "@/lib/db";
import { runTask, type Task } from "@/lib/import-tasks";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One loop, one task at a time: this is what keeps the app to a single Lichess request in flight.
async function main() {
  await query("update import_tasks set status = 'queued' where status = 'running'");
  console.log("Import worker is waiting for tasks.");
  for (;;) {
    const [task] = await query<Task>(
      `update import_tasks set status = 'running', detail = ''
       where id = (select id from import_tasks where status = 'queued' order by id limit 1)
       returning id, kind, target, fresh, (select allowlist from import_jobs where id = job_id) as allowlist`,
    );
    if (!task) {
      await sleep(2000);
      continue;
    }
    await runTask(task);
    await sleep(1000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
