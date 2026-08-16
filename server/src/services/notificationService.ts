import prisma from "../config/prisma";
import { getPresentUserIds } from "../socket/socket";

export type NotificationType = "NOTE_EDIT" | "MESSAGE" | "FILE_SHARE";

// Document saves happen on a 700ms debounce per keystroke pause, so a
// single editing session can trigger many saves in a row — without this,
// an offline member would get spammed with a notification every time the
// editor paused for under a second. Chat messages and file uploads are
// each already a single, deliberate action, so those aren't throttled.
const THROTTLE_MS: Partial<Record<NotificationType, number>> = {
  NOTE_EDIT: 5 * 60 * 1000,
};

interface NotifyParams {
  type: NotificationType;
  serverId: number;
  actorId: number;
}

// Notifies every member of a workspace EXCEPT the person who just did the
// thing, and except anyone currently present in that workspace (they're
// already seeing it live — a notification would just be a duplicate ping
// for something they're actively looking at).
export const notifyOfflineMembers = async ({
  type,
  serverId,
  actorId,
}: NotifyParams) => {
  const [server, actor, members] = await Promise.all([
    prisma.server.findUnique({
      where: { id: serverId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    }),
    prisma.membership.findMany({
      where: { serverId },
      select: { userId: true },
    }),
  ]);

  if (!server || !actor) return;

  const presentUserIds = getPresentUserIds(serverId);

  let recipientIds = members
    .map((m) => m.userId)
    .filter((userId) => userId !== actorId && !presentUserIds.has(userId));

  if (recipientIds.length === 0) return;

  const throttleMs = THROTTLE_MS[type];

  if (throttleMs) {
    const since = new Date(Date.now() - throttleMs);
    const recentlyNotified = await prisma.notification.findMany({
      where: {
        type,
        serverId,
        recipientId: { in: recipientIds },
        createdAt: { gte: since },
      },
      select: { recipientId: true },
    });
    const skip = new Set(recentlyNotified.map((n) => n.recipientId));
    recipientIds = recipientIds.filter((id) => !skip.has(id));
  }

  if (recipientIds.length === 0) return;

  await prisma.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      type,
      recipientId,
      serverId,
      serverName: server.name,
      actorName: actor.name,
    })),
  });
};