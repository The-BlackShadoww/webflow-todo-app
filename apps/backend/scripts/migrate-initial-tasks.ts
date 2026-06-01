/**
 * One-time migration: copy todo_settings.initial_tasks → todo_tasks (list_id = default).
 * Run before applying schema that drops initial_tasks.
 *
 *   pnpm --filter todo-backend db:migrate-initial-tasks
 */
import dotenv from "dotenv";
import { Pool } from "pg";
import { DEFAULT_LIST_ID } from "../src/constants/todo";

dotenv.config();

type InitialTaskRow = {
  id?: string;
  text?: string;
  completed?: boolean;
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const columnCheck = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'todo_settings'
          AND column_name = 'initial_tasks'
      ) AS exists
    `);

    if (!columnCheck.rows[0]?.exists) {
      console.log("Column todo_settings.initial_tasks not found — nothing to migrate.");
      return;
    }

    const settingsRows = await pool.query<{
      site_id: string;
      initial_tasks: InitialTaskRow[] | null;
    }>(`
      SELECT site_id, initial_tasks
      FROM todo_settings
      WHERE initial_tasks IS NOT NULL
        AND jsonb_array_length(initial_tasks) > 0
    `);

    let inserted = 0;
    let skipped = 0;

    for (const row of settingsRows.rows) {
      const tasks = Array.isArray(row.initial_tasks) ? row.initial_tasks : [];

      for (let index = 0; index < tasks.length; index++) {
        const task = tasks[index];
        const text = typeof task.text === "string" ? task.text.trim() : "";
        if (!text) {
          skipped += 1;
          continue;
        }

        const taskId =
          typeof task.id === "string" && task.id
            ? task.id
            : `task-${Date.now()}-${index}`;

        const result = await pool.query(
          `
          INSERT INTO todo_tasks (site_id, list_id, task_id, text, completed, position)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (site_id, list_id, task_id) DO NOTHING
          `,
          [
            row.site_id,
            DEFAULT_LIST_ID,
            taskId,
            text,
            task.completed === true,
            index,
          ],
        );

        if ((result.rowCount ?? 0) > 0) inserted += 1;
        else skipped += 1;
      }
    }

    console.log(
      `Migration complete: ${settingsRows.rows.length} site(s), ${inserted} task(s) inserted, ${skipped} skipped (empty or duplicate).`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
