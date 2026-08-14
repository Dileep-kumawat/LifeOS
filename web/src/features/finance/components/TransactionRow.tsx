import { format, parseISO } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Car,
  Edit2,
  Film,
  Gift,
  HeartPulse,
  Home,
  ShoppingBag,
  Tag,
  Trash2,
  TrendingUp,
  Utensils,
  Zap
} from "lucide-react";
import type { Transaction } from "../types";
import { Button } from "../../../components/Button";

interface TransactionRowProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

export function getCategoryIcon(categoryName: string) {
  const normalized = categoryName.toLowerCase();
  if (normalized.includes("food") || normalized.includes("grocer") || normalized.includes("dine"))
    return Utensils;
  if (normalized.includes("transport") || normalized.includes("commute") || normalized.includes("fuel"))
    return Car;
  if (normalized.includes("hous") || normalized.includes("rent") || normalized.includes("mortgage"))
    return Home;
  if (normalized.includes("entertain") || normalized.includes("movie") || normalized.includes("game"))
    return Film;
  if (normalized.includes("utilit") || normalized.includes("bill") || normalized.includes("power"))
    return Zap;
  if (normalized.includes("shop") || normalized.includes("cloth")) return ShoppingBag;
  if (normalized.includes("health") || normalized.includes("med") || normalized.includes("fit"))
    return HeartPulse;
  if (normalized.includes("salari") || normalized.includes("pay")) return Banknote;
  if (normalized.includes("freelanc") || normalized.includes("work")) return Briefcase;
  if (normalized.includes("invest") || normalized.includes("stock")) return TrendingUp;
  if (normalized.includes("gift")) return Gift;
  return Tag;
}

export function getCategoryBadgeColor(categoryName: string, type: "income" | "expense") {
  if (type === "income") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
  const normalized = categoryName.toLowerCase();
  if (normalized.includes("food")) return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
  if (normalized.includes("transport")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  if (normalized.includes("hous")) return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
  if (normalized.includes("entertain")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  if (normalized.includes("utilit")) return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
  if (normalized.includes("shop")) return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20";
  if (normalized.includes("health")) return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  return "bg-secondary text-secondary-foreground border-border";
}

export function TransactionRow({ transaction, onEdit, onDelete }: TransactionRowProps) {
  const IconComponent = getCategoryIcon(transaction.category);
  const isIncome = transaction.type === "income";

  const formattedDate = (() => {
    try {
      return format(parseISO(transaction.date), "MMM d, yyyy");
    } catch {
      return transaction.date;
    }
  })();

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(transaction.amount);

  return (
    <div className="group flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`flex items-center justify-center size-10 rounded-full border shrink-0 ${getCategoryBadgeColor(
            transaction.category,
            transaction.type
          )}`}
        >
          <IconComponent className="size-5" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground text-sm truncate">
              {transaction.category}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                isIncome
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              }`}
            >
              {isIncome ? (
                <ArrowUpRight className="size-3" data-icon="inline-start" />
              ) : (
                <ArrowDownLeft className="size-3" data-icon="inline-start" />
              )}
              {transaction.type}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{formattedDate}</span>
            {transaction.note && (
              <>
                <span>•</span>
                <span className="truncate max-w-[240px] italic">{transaction.note}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`text-base font-semibold tracking-tight ${
            isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
          }`}
        >
          {isIncome ? `+${formattedAmount}` : `-${formattedAmount}`}
        </span>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0"
              onClick={() => onEdit(transaction)}
              title="Edit transaction"
            >
              <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 hover:bg-rose-500/10 hover:text-rose-600"
              onClick={() => onDelete(transaction)}
              title="Delete transaction"
            >
              <Trash2 className="size-4 text-muted-foreground hover:text-rose-600" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
