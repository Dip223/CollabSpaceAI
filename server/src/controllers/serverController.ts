import { Request, Response } from "express";
import { randomUUID } from "crypto";

import prisma from "../config/prisma";

interface AuthRequest extends Request {
  userId?: number;
}

// ================= CREATE WORKSPACE =================

export const createServer = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({
        message: "Workspace name is required",
      });
    }

    const inviteCode = randomUUID().slice(0, 8);

    const server = await prisma.server.create({
      data: {
        name,
        inviteCode,
        ownerId: req.userId!,
      },
    });

    // Owner automatically becomes a member
    await prisma.membership.create({
      data: {
        userId: req.userId!,
        serverId: server.id,
      },
    });

    return res.status(201).json({
      message: "Workspace created successfully",
      server,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= JOIN WORKSPACE =================

export const joinServer = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const inviteCode = String(
      req.body.inviteCode || ""
    ).trim();

    if (!inviteCode) {
      return res.status(400).json({
        message: "Invite code is required",
      });
    }

    const server = await prisma.server.findUnique({
      where: {
        inviteCode,
      },
    });

    if (!server) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const existing =
      await prisma.membership.findUnique({
        where: {
          userId_serverId: {
            userId: req.userId!,
            serverId: server.id,
          },
        },
      });

    if (existing) {
      return res.status(400).json({
        message: "Already joined this workspace",
      });
    }

    await prisma.membership.create({
      data: {
        userId: req.userId!,
        serverId: server.id,
      },
    });

    return res.status(201).json({
      message: "Joined successfully",
      server,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= MY WORKSPACES =================

export const getMyServers = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const memberships =
      await prisma.membership.findMany({
        where: {
          userId: req.userId!,
        },
        include: {
          server: true,
        },
        orderBy: {
          joinedAt: "desc",
        },
      });

    return res.json({
      servers: memberships.map(
        (membership) => membership.server
      ),
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= GET SINGLE WORKSPACE =================

export const getServer = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    const server =
      await prisma.server.findUnique({
        where: {
          id,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

    if (!server) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    return res.json({
      server,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= GET WORKSPACE MEMBERS =================

export const serverMembers = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const serverId = Number(req.params.id);

    const server =
      await prisma.server.findUnique({
        where: {
          id: serverId,
        },
      });

    if (!server) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const members =
      await prisma.membership.findMany({
        where: {
          serverId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

    return res.json({
      members: members.map(
        (member) => member.user
      ),
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};