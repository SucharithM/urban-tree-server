import type { Request, Response } from "express";

import { authenticateUser, generateAuthToken } from "../services/auth/auth.service";

export async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateAuthToken(user);

    // Send token both as JSON and as httpOnly cookie
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      })
      .json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
  } catch (err) {
    console.error("[loginHandler] Error:", err);
    res.status(500).json({ error: "Login failed" });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  try {
    // Clear cookie; client should also drop any stored Bearer token
    res
      .clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      })
      .json({ success: true });
  } catch (err) {
    console.error("[logoutHandler] Error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
}
