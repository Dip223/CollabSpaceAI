import { Response } from "express";
import prisma from "../config/prisma";
import cloudinary from "../config/cloudinary";
import { getIO } from "../socket/socket";
import { AuthRequest } from "../middleware/authMiddleware";

const uploadBuffer = (
  buffer: Buffer,
  filename: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "collabspace",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
};

// ================= UPLOAD FILE =================

export const uploadFile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const serverId = Number(req.params.serverId);

    if (!req.file) {
      return res.status(400).json({
        message: "No file provided",
      });
    }

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

    const result = await uploadBuffer(
      req.file.buffer,
      req.file.originalname
    );

    const file = await prisma.file.create({
      data: {
        name: req.file.originalname,
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        mimeType: req.file.mimetype,
        size: req.file.size,
        serverId,
        uploadedBy: req.userId!,
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    getIO()?.to(`workspace-${serverId}`).emit("file-uploaded", file);

    return res.status(201).json(file);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= LIST FILES =================

export const getFiles = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const serverId = Number(req.params.serverId);

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

    const files = await prisma.file.findMany({
      where: { serverId },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ files });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= DELETE FILE =================

export const deleteFile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const fileId = Number(req.params.fileId);

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return res.status(404).json({
        message: "File not found",
      });
    }

    const server = await prisma.server.findUnique({
      where: { id: file.serverId },
    });

    const isUploader = file.uploadedBy === req.userId;
    const isOwner = server?.ownerId === req.userId;

    if (!isUploader && !isOwner) {
      return res.status(403).json({
        message: "You don't have permission to delete this file",
      });
    }

    if (file.publicId) {
      await cloudinary.uploader.destroy(file.publicId, {
        resource_type: file.resourceType || "image",
      });
    }

    await prisma.file.delete({ where: { id: fileId } });

    const deleter = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { name: true },
    });

    getIO()?.to(`workspace-${file.serverId}`).emit("file-deleted", {
      fileId: file.id,
      fileName: file.name,
      deletedBy: deleter?.name || "Someone",
    });

    return res.json({ message: "File deleted" });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};
