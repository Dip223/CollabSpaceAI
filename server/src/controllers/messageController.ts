import { Request, Response } from "express";
import prisma from "../config/prisma";

interface AuthRequest extends Request {
  userId?: number;
}

// ================= SEND MESSAGE =================

export const sendMessage = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const serverId = Number(req.params.serverId);
    const content = String(req.body.content || "").trim();

    if (!content) {
      return res.status(400).json({
        message: "Message cannot be empty",
      });
    }

    // Check membership
    const member = await prisma.membership.findUnique({
      where: {
        userId_serverId: {
          userId: req.userId!,
          serverId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const message = await prisma.message.create({
      data: {
        content,
        serverId,
        senderId: req.userId!,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json(message);

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });

  }
};

// ================= GET ALL MESSAGES =================

export const getMessages = async (
  req: AuthRequest,
  res: Response
) => {
  try {

    const serverId = Number(req.params.serverId);

    // Check membership
    const member = await prisma.membership.findUnique({
      where: {
        userId_serverId: {
          userId: req.userId!,
          serverId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        serverId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.json(messages);

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });

  }
};