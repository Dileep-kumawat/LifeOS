import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface LoaderProps extends HTMLAttributes<HTMLDivElement> {}

export function Loader({ className, ...props }: LoaderProps) {
  return <div className={cn("loader text-[#000000]", className)} {...props} />;
}
