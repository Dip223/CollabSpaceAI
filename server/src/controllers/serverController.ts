import { Request, Response } from "express";
import crypto from "crypto";

import prisma from "../config/prisma";

interface AuthRequest extends Request {
  userId?: number;
}

// =========================
// Create Server
// =========================
export const createServer = async (
  req: AuthRequest,
  res: Response
) => {

  try {

    if (!req.body) {
      return res.status(400).json({
        message: "Request body missing"
      });
    }

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Server name is required"
      });
    }

    const inviteCode =
      crypto.randomBytes(4).toString("hex");

    const server =
      await prisma.server.create({
        data: {
          name,
          inviteCode,
          ownerId: req.userId!
        }
      });

    res.status(201).json({
      message: "Server created",
      server
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }

};

// =========================
// Join Server
// =========================
export const joinServer = async (
  req: AuthRequest,
  res: Response
) => {

  try {

    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({
        message: "Invite code is required"
      });
    }

    // Find server
    const server = await prisma.server.findUnique({
      where: {
        inviteCode
      }
    });

    if (!server) {
      return res.status(404).json({
        message: "Server not found"
      });
    }

    // Check if already joined
    const existingMembership =
      await prisma.membership.findUnique({
        where: {
          userId_serverId: {
            userId: req.userId!,
            serverId: server.id
          }
        }
      });

    if (existingMembership) {
      return res.status(400).json({
        message: "Already joined this server"
      });
    }

    // Join server
    const membership =
      await prisma.membership.create({
        data: {
          userId: req.userId!,
          serverId: server.id
        }
      });

    res.status(201).json({
      message: "Joined successfully",
      membership
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }

};

// =========================
// My Servers
// =========================
export const myServers = async (
  req: AuthRequest,
  res: Response
) => {

  try {

    const memberships =
      await prisma.membership.findMany({

        where: {
          userId: req.userId!
        },

        include: {
          server: true
        }

      });

    const servers =
      memberships.map(
        (membership) => membership.server
      );

    res.json({
      servers
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }

};

// =========================
// Server Members
// =========================
export const serverMembers = async (
  req: AuthRequest,
  res: Response
) => {

  try {

    const serverId = Number(req.params.id);

    const members =
      await prisma.membership.findMany({

        where: {
          serverId
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }

      });

    res.json({
      members: members.map(
        (member) => member.user
      )
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }

};