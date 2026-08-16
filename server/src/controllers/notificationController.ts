import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

// ================= GET NOTIFICATIONS =================

export const getNotifications = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({ notifications });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= UNREAD COUNT =================
// Lightweight, separate from the full list above so the topbar bell badge
// doesn't need to fetch and hold 50 full notification rows just to show a
// number.

export const getUnreadCount = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const count = await prisma.notification.count({
      where: { recipientId: req.userId!, read: false },
    });

    return res.json({ count });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= MARK ALL AS READ =================

export const markAllRead = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    await prisma.notification.updateMany({
      where: { recipientId: req.userId!, read: false },
      data: { read: true },
    });

    return res.json({ message: "Marked as read" });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};