import cron, { ScheduledTask } from "node-cron";
import { prisma } from "./db";
import { runBackup } from "./backup-service";

// Store running cron tasks by Schedule ID
const activeTasks = new Map<string, ScheduledTask>();

// Keep track of initialization state to prevent multiple launches in dev hot-reloads
let isInitialized = false;

export async function startScheduler() {
  if (isInitialized) {
    console.log("Scheduler already initialized.");
    return;
  }

  isInitialized = true;
  console.log("Initializing VaultBase scheduler...");
  await reloadSchedules();
}

export async function reloadSchedules() {
  try {
    // 1. Stop all current active tasks
    console.log(`Stopping ${activeTasks.size} active scheduler tasks...`);
    for (const [id, task] of activeTasks.entries()) {
      task.stop();
    }
    activeTasks.clear();

    // 2. Fetch global timezone setting (defaulting to Europe/Istanbul)
    const timezoneSetting = await prisma.setting.findUnique({
      where: { key: "timezone" },
    });
    const timezone = timezoneSetting?.value || "Europe/Istanbul";
    console.log(`Configured system timezone for scheduling: ${timezone}`);

    // 3. Fetch all active schedules from SQLite
    const activeSchedules = await prisma.schedule.findMany({
      where: { enabled: true },
      include: { database: true },
    });

    console.log(`Found ${activeSchedules.length} active schedule(s). Setting up tasks...`);

    // 4. Set up node-cron task for each active schedule
    for (const schedule of activeSchedules) {
      if (!cron.validate(schedule.cron)) {
        console.error(`Invalid cron expression for Schedule ID ${schedule.id}: ${schedule.cron}`);
        continue;
      }

      // Create a background cron job
      const task = cron.schedule(
        schedule.cron,
        async () => {
          console.log(`[Scheduler] Triggered backup for database '${schedule.database.name}' (Schedule ID: ${schedule.id})`);
          try {
            const result = await runBackup(schedule.databaseId, "scheduled");
            if (result.success) {
              console.log(`[Scheduler] Scheduled backup succeeded for '${schedule.database.name}': ${result.filename}`);
            } else {
              console.error(`[Scheduler] Scheduled backup failed for '${schedule.database.name}': ${result.error}`);
            }
          } catch (error) {
            console.error(`[Scheduler] Uncaught error during scheduled backup:`, error);
          }
        },
        {
          timezone,
        }
      );

      // Register task
      activeTasks.set(schedule.id, task);
      console.log(`[Scheduler] Registered job for '${schedule.database.name}' | Cron: [${schedule.cron}] | Timezone: [${timezone}]`);
    }

    console.log(`VaultBase scheduler successfully reloaded. Running tasks: ${activeTasks.size}`);
  } catch (error) {
    console.error("Failed to reload schedules:", error);
  }
}
