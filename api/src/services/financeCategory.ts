import { Types } from "mongoose";
import { Category } from "../models/Category.js";
import { Transaction } from "../models/Transaction.js";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@lifeos/shared";

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export async function seedDefaultCategories(userId: string | Types.ObjectId): Promise<void> {
  const existingCount = await Category.countDocuments({ userId });
  if (existingCount > 0) return;

  const docsToCreate = [
    ...DEFAULT_INCOME_CATEGORIES.map((name) => ({
      userId,
      name,
      type: "income" as const
    })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
      userId,
      name,
      type: "expense" as const
    }))
  ];

  try {
    await Category.insertMany(docsToCreate, { ordered: false });
  } catch (err: any) {
    // Ignore duplicate key errors if concurrent calls happen
    if (err.code !== 11000) {
      throw err;
    }
  }
}

export async function normalizeAndFindOrCreateCategory(
  userId: string | Types.ObjectId,
  rawName: string,
  type: "income" | "expense"
): Promise<string> {
  const trimmed = rawName.trim();
  if (!trimmed) {
    throw new Error("Category name cannot be empty");
  }

  // Ensure user has default categories seeded first
  await seedDefaultCategories(userId);

  // Case-insensitive exact match
  const existing = await Category.findOne({
    userId,
    type,
    name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") }
  });

  if (existing) {
    return existing.name;
  }

  // Not found, create new custom category
  try {
    const created = await Category.create({
      userId,
      name: trimmed,
      type
    });
    return created.name;
  } catch (err: any) {
    // If concurrent insert occurred, return existing
    if (err.code === 11000) {
      const fallback = await Category.findOne({
        userId,
        type,
        name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") }
      });
      if (fallback) return fallback.name;
    }
    throw err;
  }
}

export async function reassignCategoryTransactions(
  userId: string | Types.ObjectId,
  oldCategoryName: string,
  type: "income" | "expense"
): Promise<number> {
  // Ensure "Other" category exists for this user and type
  const targetCategoryName = await normalizeAndFindOrCreateCategory(userId, "Other", type);

  const result = await Transaction.updateMany(
    { userId, type, category: oldCategoryName },
    { $set: { category: targetCategoryName } }
  );

  return result.modifiedCount;
}
