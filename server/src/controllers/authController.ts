import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/authMiddleware";

import prisma from "../config/prisma";
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
} from "../services/mailService";

// ================= REGISTER =================

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password);

    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        message: "Name, an email, and a password of at least 6 characters are required.",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const requiresEmailVerification =
      process.env.REQUIRE_EMAIL_VERIFICATION !== "false";

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isVerified: !requiresEmailVerification,
      },
    });

    if (requiresEmailVerification) {
      const verifyToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "1d",
        }
      );

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          verifyToken,
        },
      });

      await sendVerificationEmail(user.email, verifyToken);
    }

    const { password: _, ...safeUser } = user;

    return res.status(201).json({
      message: requiresEmailVerification
        ? "User registered. Verification email sent."
        : "User registered. Email verification is disabled for local development.",
      user: safeUser,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= LOGIN =================

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password);

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const match = await bcrypt.compare(
      password,
      user.password
    );

    if (!match) {
      return res.status(401).json({
        message: "Wrong password",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
  message: "Login successful",
  token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    isVerified: user.isVerified,
  },
});

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= VERIFY EMAIL =================

export const verifyEmail = async (
  req: Request,
  res: Response
) => {
  try {
    const token = String(req.params.token);

    let tokenPayload: { id: number };
    try {
      tokenPayload = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as { id: number };
    } catch {
      return res.status(400).json({
        message: "Verification link is invalid or has expired. Request a new one from the login page.",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        verifyToken: token,
        id: tokenPayload.id,
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid token",
      });
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        isVerified: true,
        verifyToken: null,
      },
    });

    return res.json({
      message: "Email verified successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= RESEND VERIFICATION =================

export const resendVerification = async (
  req: Request,
  res: Response
) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "User already verified",
      });
    }

    const verifyToken = jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1d",
      }
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        verifyToken,
      },
    });

    await sendVerificationEmail(
      user.email,
      verifyToken
    );

    return res.json({
      message: "Verification email sent again",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= FORGOT PASSWORD =================

export const forgotPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (!user) {
  return res.json({
    message: "If an account exists, a password reset email has been sent.",
  });
}

    const resetToken = jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1h",
      }
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: new Date(
          Date.now() + 60 * 60 * 1000
        ),
      },
    });

    await sendResetPasswordEmail(
      user.email,
      resetToken
    );

    return res.json({
      message: "Password reset email sent.",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= RESET PASSWORD =================

export const resetPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const token = String(req.params.token);
    const password = String(req.body.password);

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    try {
      jwt.verify(
        token,
        process.env.JWT_SECRET as string
      );
    } catch {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid reset token",
      });
    }

    if (
      !user.passwordResetExpiry ||
      user.passwordResetExpiry < new Date()
    ) {
      return res.status(400).json({
        message: "Reset link has expired",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return res.json({
      message: "Password reset successful",
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};



// ================= GET CURRENT USER =================


export const getMe = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(user);

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};
