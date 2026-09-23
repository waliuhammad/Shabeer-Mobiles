import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckoutStep } from "@/types";

interface CheckoutStepsProps {
  current: CheckoutStep;
}

const STEPS: { id: CheckoutStep; label: string }[] = [
  { id: "shipping", label: "Shipping" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
];

/**
 * The Shipping -> Payment -> Review indicator.
 *
 * A Server Component: it derives everything from the `current` prop and
 * holds no state of its own. The step state lives one level up in
 * CheckoutView, which is the only thing that needs to be interactive.
 */
export function CheckoutSteps({ current }: CheckoutStepsProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav aria-label="Checkout progress" className="mb-8">
      <ol className="flex items-center">
        {STEPS.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li
              key={step.id}
              className={cn("flex items-center", index < STEPS.length - 1 && "flex-1")}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                    isDone && "bg-success text-white",
                    isCurrent && "bg-primary text-primary-foreground",
                    !isDone && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>

                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-primary" : "text-muted-foreground",
                    // The labels crowd a 360px screen, so only the current
                    // one shows on mobile.
                    !isCurrent && "hidden sm:inline"
                  )}
                  // Tells assistive tech which step the customer is on.
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-3 h-0.5 flex-1 rounded-full transition-colors",
                    index < currentIndex ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
