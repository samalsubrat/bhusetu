import { cn } from "@/lib/utils";
import { ReactNode } from "react";

const MaxWidthWrapper = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => {
  return (
    <div
      className={cn(
        "h-full mx-auto w-full max-w-7xl px-4 ",
        className
      )}
    >
      {children}
    </div>
  );
};

export default MaxWidthWrapper;