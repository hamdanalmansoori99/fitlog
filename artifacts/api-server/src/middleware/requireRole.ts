import { Request, Response, NextFunction } from "express";
import { getUser } from "../lib/auth";

export type UserRole = "user" | "premium" | "admin";

const ROLE_HIERARCHY: UserRole[] = ["user", "premium", "admin"];

/**
 * Middleware that enforces a minimum user role.
 * Roles are hierarchical: admin > premium > user.
 *
 * Usage:
 *   router.get("/admin/stats", requireAuth, requireRole("admin"), handler)
 *   router.get("/export", requireAuth, requireRole("premium"), handler)
 */
export function requireRole(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = getUser(req) as any;
    const userRole: UserRole = user?.role ?? "user";

    const userLevel = ROLE_HIERARCHY.indexOf(userRole);
    const requiredLevel = ROLE_HIERARCHY.indexOf(minimumRole);

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: "Insufficient permissions",
        required: minimumRole,
        current: userRole,
      });
      return;
    }

    next();
  };
}

export function getUserRole(req: Request): UserRole {
  const user = getUser(req) as any;
  return (user?.role as UserRole) ?? "user";
}
