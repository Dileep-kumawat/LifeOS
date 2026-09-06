import { Router, type Request, type Response } from "express";
import { isValidObjectId } from "mongoose";
import {
  adminUsersListQuerySchema,
  adminUserStatusUpdateSchema,
  adminUserRoleUpdateSchema,
  adminUserSubscriptionUpdateSchema,
  auditLogsQuerySchema
} from "@lifeos/shared";
import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { Transaction } from "../models/Transaction.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { adminRateLimiter, adminAuditRateLimiter } from "../middleware/rateLimiter.js";
import { auditService } from "../services/auditService.js";
import { revokeAllUserTokens } from "../auth/tokenService.js";

export const adminRouter = Router();

adminRouter.use("/admin", requireAuth, requireRole("admin"), adminRateLimiter);

function formatAdminUserProfile(user: any) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    subscriptionTier: user.subscriptionTier,
    emailVerified: user.emailVerified,
    googleId: user.googleId || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt ? user.updatedAt.toISOString() : user.createdAt.toISOString()
  };
}

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List and search user accounts
 *     description: Administrative endpoint to search and filter user accounts. Audited as USER_LOOKUP.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [user, admin] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, suspended, soft_deleted] }
 *     responses:
 *       200:
 *         description: List of user accounts
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
adminRouter.get(
  "/admin/users",
  validate(adminUsersListQuerySchema, "query"),
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, search, role, status } = req.query as any;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      const filter: Record<string, any> = {};
      if (role) filter.role = role;
      if (status) filter.status = status;
      if (search) {
        const regex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
        filter.$or = [{ email: regex }, { name: regex }];
      }

      const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        User.countDocuments(filter)
      ]);

      auditService
        .log({
          req,
          action: "USER_LOOKUP",
          resourceType: "user_collection",
          outcome: "SUCCESS",
          metadata: { search: search || null, role: role || null, status: status || null }
        })
        .catch(() => {});

      const totalPages = Math.ceil(total / limitNum) || 1;

      return res.status(200).json({
        users: users.map(formatAdminUserProfile),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasMore: pageNum < totalPages
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: "InternalServerError", message: err.message });
    }
  }
);

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get single user account details
 *     description: Administrative endpoint to inspect a specific user account. Audited as USER_LOOKUP.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */
adminRouter.get("/admin/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "BadRequest", message: "Invalid user ID format" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "NotFound", message: "User not found" });
    }

    auditService
      .log({
        req,
        action: "USER_LOOKUP",
        resourceType: "user",
        resourceId: id,
        targetUserId: id,
        outcome: "SUCCESS"
      })
      .catch(() => {});

    return res.status(200).json(formatAdminUserProfile(user));
  } catch (err: any) {
    return res.status(500).json({ error: "InternalServerError", message: err.message });
  }
});

/**
 * @openapi
 * /admin/users/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Update user account status (suspend, activate, deactivate)
 *     description: Administrative action modifying user lifecycle status. Critical audit log persisted deterministically.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [active, suspended, soft_deleted] }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       404:
 *         description: User not found
 */
adminRouter.patch(
  "/admin/users/:id/status",
  validate(adminUserStatusUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ error: "BadRequest", message: "Invalid user ID format" });
      }

      const { status, reason } = req.body;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: "NotFound", message: "User not found" });
      }

      const previousStatus = user.status;
      user.status = status;
      if (status === "soft_deleted") {
        user.deletedAt = new Date();
      } else if (status === "active") {
        user.deletedAt = null;
      }
      await user.save();

      // Invalidate active sessions if suspending or deactivating
      if (status === "suspended" || status === "soft_deleted") {
        await revokeAllUserTokens(id);
      }

      await auditService.log(
        {
          req,
          action: status === "suspended" ? "USER_SUSPENSION" : status === "active" ? "USER_RESTORATION" : "USER_DEACTIVATION",
          resourceType: "user",
          resourceId: id,
          targetUserId: id,
          outcome: "SUCCESS",
          reason: reason || null,
          metadata: { previousStatus, newStatus: status }
        },
        { critical: true }
      );

      return res.status(200).json({
        message: `User status successfully updated to ${status}`,
        user: formatAdminUserProfile(user)
      });
    } catch (err: any) {
      return res.status(500).json({ error: "InternalServerError", message: err.message });
    }
  }
);

/**
 * @openapi
 * /admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Update user role (promote to admin, demote to user)
 *     description: Administrative action changing authorization roles. Critical audit log persisted deterministically.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [user, admin] }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       404:
 *         description: User not found
 */
adminRouter.patch(
  "/admin/users/:id/role",
  validate(adminUserRoleUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ error: "BadRequest", message: "Invalid user ID format" });
      }

      const { role, reason } = req.body;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: "NotFound", message: "User not found" });
      }

      const previousRole = user.role;
      user.role = role;
      await user.save();

      await auditService.log(
        {
          req,
          action: "USER_ROLE_CHANGE",
          resourceType: "user",
          resourceId: id,
          targetUserId: id,
          outcome: "SUCCESS",
          reason: reason || null,
          metadata: { previousRole, newRole: role }
        },
        { critical: true }
      );

      return res.status(200).json({
        message: `User role successfully updated to ${role}`,
        user: formatAdminUserProfile(user)
      });
    } catch (err: any) {
      return res.status(500).json({ error: "InternalServerError", message: err.message });
    }
  }
);

/**
 * @openapi
 * /admin/users/{id}/subscription:
 *   patch:
 *     tags: [Admin]
 *     summary: Update user subscription tier
 *     description: Administrative action modifying user subscription tier (free, pro). Critical audit log persisted deterministically.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subscriptionTier]
 *             properties:
 *               subscriptionTier: { type: string, enum: [free, pro] }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Subscription tier updated successfully
 *       404:
 *         description: User not found
 */
adminRouter.patch(
  "/admin/users/:id/subscription",
  validate(adminUserSubscriptionUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ error: "BadRequest", message: "Invalid user ID format" });
      }

      const { subscriptionTier, reason } = req.body;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: "NotFound", message: "User not found" });
      }

      const previousTier = user.subscriptionTier;
      user.subscriptionTier = subscriptionTier;
      await user.save();

      await auditService.log(
        {
          req,
          action: "USER_SUBSCRIPTION_CHANGE",
          resourceType: "user",
          resourceId: id,
          targetUserId: id,
          outcome: "SUCCESS",
          reason: reason || null,
          metadata: { previousTier, newTier: subscriptionTier }
        },
        { critical: true }
      );

      return res.status(200).json({
        message: `User subscription tier successfully updated to ${subscriptionTier}`,
        user: formatAdminUserProfile(user)
      });
    } catch (err: any) {
      return res.status(500).json({ error: "InternalServerError", message: err.message });
    }
  }
);

/**
 * @openapi
 * /admin/users/{id}/purge:
 *   post:
 *     tags: [Admin]
 *     summary: Hard purge user account and all associated tokens
 *     description: Immediately purges user account and records critical audit log.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User account purged successfully
 *       404:
 *         description: User not found
 */
adminRouter.post("/admin/users/:id/purge", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "BadRequest", message: "Invalid user ID format" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "NotFound", message: "User not found" });
    }

    await RefreshToken.deleteMany({ userId: id });
    await User.findByIdAndDelete(id);

    await auditService.log(
      {
        req,
        action: "ACCOUNT_PURGE",
        resourceType: "user",
        resourceId: id,
        targetUserId: id,
        outcome: "SUCCESS",
        metadata: { purgedEmail: user.email }
      },
      { critical: true }
    );

    return res.status(200).json({ message: "User account and all sessions permanently purged" });
  } catch (err: any) {
    return res.status(500).json({ error: "InternalServerError", message: err.message });
  }
});

/**
 * @openapi
 * /admin/users/{id}/finance:
 *   get:
 *     tags: [Admin]
 *     summary: Privileged access to user financial records
 *     description: Administrative inspection of a specific user's transactions. Explicitly audited as ADMIN_SENSITIVE_ACCESS.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User transaction records
 *       404:
 *         description: User not found
 */
adminRouter.get("/admin/users/:id/finance", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "BadRequest", message: "Invalid user ID format" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "NotFound", message: "User not found" });
    }

    const transactions = await Transaction.find({ userId: id }).sort({ date: -1 }).limit(50);

    await auditService.log(
      {
        req,
        action: "ADMIN_SENSITIVE_ACCESS",
        resourceType: "finance",
        targetUserId: id,
        outcome: "SUCCESS",
        metadata: { recordsRetrieved: transactions.length }
      },
      { critical: true }
    );

    return res.status(200).json({
      userId: id,
      transactionsCount: transactions.length,
      transactions: transactions.map((t) => ({
        id: t._id.toString(),
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date.toISOString(),
        note: t.note || ""
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ error: "InternalServerError", message: err.message });
  }
});

/**
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: Query security audit logs
 *     description: Admin-only, paginated, strictly bounded audit trail search. Cannot modify or delete logs.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: resourceType
 *         schema: { type: string }
 *       - in: query
 *         name: actorUserId
 *         schema: { type: string }
 *       - in: query
 *         name: targetUserId
 *         schema: { type: string }
 *       - in: query
 *         name: outcome
 *         schema: { type: string, enum: [SUCCESS, DENIED, ERROR] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated security audit records
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
adminRouter.get(
  "/admin/audit-logs",
  adminAuditRateLimiter,
  validate(auditLogsQuerySchema, "query"),
  async (req: Request, res: Response) => {
    try {
      const result = await auditService.queryLogs(req.query as any);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ error: "InternalServerError", message: err.message });
    }
  }
);
