import { Request, Response } from "express";
import prisma from "../config/prisma";

interface AuthRequest extends Request {
  userId?: number;
}

const checkMembership = (serverId: number, userId: number) =>
  prisma.membership.findUnique({
    where: {
      userId_serverId: {
        userId,
        serverId,
      },
    },
  });

// ================= GET NOTE =================

export const getNote = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const serverId = Number(req.params.serverId);

    const member = await checkMembership(serverId, req.userId!);
    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const note = await prisma.note.findUnique({
      where: { serverId },
    });

    return res.json({
      content: note?.content ?? "",
      updatedAt: note?.updatedAt ?? null,
      updatedBy: note?.updatedBy ?? null,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= SAVE NOTE =================

export const saveNote = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const serverId = Number(req.params.serverId);
    const content = String(req.body.content ?? "");

    const member = await checkMembership(serverId, req.userId!);
    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const note = await prisma.note.upsert({
      where: { serverId },
      update: {
        content,
        updatedBy: req.userId!,
      },
      create: {
        serverId,
        content,
        updatedBy: req.userId!,
      },
    });

    return res.json({
      content: note.content,
      updatedAt: note.updatedAt,
      updatedBy: note.updatedBy,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};