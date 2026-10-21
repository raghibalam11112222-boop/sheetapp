/**
 * Background job abstraction (app.txt §37 "Performance").
 *
 * MVP runs everything inline in the request: the interface below lets a real
 * queue (e.g. BullMQ/Redis, pg-boss) take over long poles like record import
 * without rewriting callers. Select with JOB_QUEUE (only "inline" exists).
 */
export interface Job<T> {
  /** Stable name for logging and future queue routing, e.g. "import-records". */
  name: string;
  run(): Promise<T>;
}

export interface JobQueue {
  enqueue<T>(job: Job<T>): Promise<T>;
}

class InlineJobQueue implements JobQueue {
  async enqueue<T>(job: Job<T>): Promise<T> {
    return job.run();
  }
}

let queue: JobQueue | null = null;

export function getJobQueue(): JobQueue {
  const configured = (process.env.JOB_QUEUE ?? "inline").trim().toLowerCase();
  if (configured !== "inline") {
    throw new Error(
      `[SheetApp] JOB_QUEUE="${configured}" is not implemented. Only "inline" is available in this build.`
    );
  }
  if (!queue) queue = new InlineJobQueue();
  return queue;
}
