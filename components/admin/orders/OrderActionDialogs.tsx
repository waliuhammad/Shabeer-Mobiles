"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrders } from "@/context/OrdersContext";
import {
  ORDER_STATUS_CONFIG,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_CONFIG,
  getAllowedNextStatuses,
} from "@/lib/order-status";
import { formatPrice, cn } from "@/lib/utils";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

/* ==================================================================
   UPDATE ORDER STATUS

   The dropdown only offers statuses that ALLOWED_TRANSITIONS permits
   from here, so an invalid move cannot even be selected. The context
   re-checks on submit anyway - a UI that merely hides an option is not
   a rule, and this same validation has to survive being called from
   somewhere else later.
   ================================================================== */

export function UpdateStatusDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateOrderStatus } = useOrders();
  const allowed = getAllowedNextStatuses(order.status);
  const [next, setNext] = useState<OrderStatus | "">("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!next) {
      setError("Choose the new status.");
      return;
    }

    const result = await updateOrderStatus(order.orderNumber, next);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success("Order status updated.", {
      description: `${order.orderNumber}: ${ORDER_STATUS_CONFIG[order.status].label} → ${ORDER_STATUS_CONFIG[next].label}`,
    });
    setNext("");
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setNext(""); setError(null); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            {order.orderNumber} &middot; currently{" "}
            {ORDER_STATUS_CONFIG[order.status].label}
          </DialogDescription>
        </DialogHeader>

        {allowed.length === 0 ? (
          <>
            <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              An order that is{" "}
              {ORDER_STATUS_CONFIG[order.status].label.toLowerCase()} cannot move
              anywhere else. Orders never move backwards - that would erase the
              record of what actually happened.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10">
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="next-status" className="mb-1.5 block text-sm font-medium text-foreground">
                New status
              </label>
              <Select value={next} onValueChange={(v) => { setNext(v as OrderStatus); setError(null); }}>
                <SelectTrigger id="next-status" className="h-10 w-full">
                  <SelectValue placeholder="Choose a status" />
                </SelectTrigger>
                <SelectContent>
                  {allowed.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ORDER_STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {next && (
              <p className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <span className="font-medium text-muted-foreground">
                  {ORDER_STATUS_CONFIG[order.status].label}
                </span>
                <ArrowRight className="size-4 text-secondary" aria-hidden="true" />
                <span className="font-semibold text-primary">
                  {ORDER_STATUS_CONFIG[next].label}
                </span>
              </p>
            )}

            {error && (
              <p role="alert" className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
                <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <p className="rounded-md bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              Demo only. This records the change and an activity entry in this
              browser. It does NOT create a sale, touch stock, or notify the
              customer.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10">
                Cancel
              </Button>
              <Button type="submit" disabled={!next} className="h-10 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep">
                Update Status
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ==================================================================
   UPDATE PAYMENT STATUS

   Unconstrained by the order status on purpose: a delivered order can
   still be awaiting cash from the rider, and a cancelled one may need
   refunding. These two fields move independently.
   ================================================================== */

export function UpdatePaymentDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updatePaymentStatus } = useOrders();
  const [next, setNext] = useState<PaymentStatus | "">("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!next) {
      setError("Choose the new payment status.");
      return;
    }

    const result = await updatePaymentStatus(order.orderNumber, next);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success("Payment status updated.", {
      description: `${order.orderNumber}: ${PAYMENT_STATUS_CONFIG[next].label}`,
    });
    setNext("");
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setNext(""); setError(null); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Payment Status</DialogTitle>
          <DialogDescription>
            {order.orderNumber} &middot; {formatPrice(order.total)} &middot;
            currently {PAYMENT_STATUS_CONFIG[order.paymentStatus].label}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="next-payment" className="mb-1.5 block text-sm font-medium text-foreground">
              New payment status
            </label>
            <Select value={next} onValueChange={(v) => { setNext(v as PaymentStatus); setError(null); }}>
              <SelectTrigger id="next-payment" className="h-10 w-full">
                <SelectValue placeholder="Choose a status" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.filter((s) => s !== order.paymentStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {PAYMENT_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
              <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <p className="rounded-md bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Demo only. No payment is taken and no refund is issued - marking
            something Refunded here does not move any money.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10">
              Cancel
            </Button>
            <Button type="submit" disabled={!next} className="h-10 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep">
              Update Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ==================================================================
   CANCEL ORDER
   ================================================================== */

export function CancelOrderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { cancelOrder } = useOrders();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    const result = await cancelOrder(order.orderNumber, reason);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success("Order cancelled.", { description: order.orderNumber });
    setReason("");
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setReason(""); setError(null); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this order?</DialogTitle>
          <DialogDescription>
            This cannot be undone. A cancelled order is never reopened - the
            customer places a new one, so the record of the cancellation
            survives.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Order</dt>
            <dd className="font-semibold text-primary">{order.orderNumber}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="truncate font-medium text-foreground">{order.customerName}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-heading font-bold tabular-nums text-primary">
              {formatPrice(order.total)}
            </dd>
          </div>
        </dl>

        <div>
          <label htmlFor="cancel-reason" className="mb-1.5 block text-sm font-medium text-foreground">
            Reason (optional)
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. customer changed their mind"
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary focus:ring-2 focus:ring-ring/30"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Recorded in the order&apos;s activity history.
          </p>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <p className={cn("rounded-md bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground")}>
          No stock is returned, because none was ever deducted - creating an
          order is not a sale. No refund is issued and no email is sent.
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10">
            Keep Order
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="h-10 bg-destructive font-semibold text-destructive-foreground hover:bg-destructive/90"
          >
            Cancel Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
