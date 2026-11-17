import { db } from "./db";
import { notifications } from "./db/schema";

type Executor = Pick<typeof db, "insert">;

export async function notify(
  userId: number,
  n: { title: string; body?: string; link?: string },
  executor: Executor = db,
) {
  await executor.insert(notifications).values({ userId, title: n.title, body: n.body ?? null, link: n.link ?? null });
}
