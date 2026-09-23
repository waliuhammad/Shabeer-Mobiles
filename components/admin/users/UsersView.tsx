"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShieldAlert, Plus, Pencil, UserX, UserCheck, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/FormField";
import { seedStaff, type StaffMember, type StaffStatus } from "@/data/staff";
import { adminNavItems, type AdminRole } from "@/lib/admin-nav";
import { isValidEmail, isValidPakistaniPhone } from "@/lib/validation";
import { formatOrderDate } from "@/lib/order-utils";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: Record<AdminRole, { label: string; badgeClass: string; summary: string }> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    badgeClass: "bg-primary/10 text-primary",
    summary: "Everything, including purchase costs, profit and staff.",
  },
  MANAGER: {
    label: "Manager",
    badgeClass: "bg-cyan-soft text-secondary",
    summary: "Catalogue, inventory, orders, purchases, customers and reports.",
  },
  CASHIER: {
    label: "Cashier",
    badgeClass: "bg-accent/20 text-gold-deep",
    summary: "POS, billing and customers only. No costs, no profit.",
  },
};

const ROLES: AdminRole[] = ["SUPER_ADMIN", "MANAGER", "CASHIER"];

interface Draft {
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  note: string;
}

const EMPTY: Draft = { name: "", email: "", phone: "", role: "CASHIER", note: "" };

/**
 * /admin/users.
 *
 * WHAT THIS PAGE IS: a place to record who works here and what each
 * person should be allowed to do.
 *
 * WHAT IT IS NOT: authentication. Nothing here signs anyone in or blocks
 * a single route - /admin is open to anyone who types the URL. The page
 * states that at the top rather than implying a protection that does not
 * exist, because a false sense of security is worse than none.
 */
export function UsersView() {
  const [staff, setStaff] = useState<StaffMember[]>(seedStaff);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | undefined>();

  const permissions = useMemo(() => {
    // Derived from the SAME nav definition the sidebar uses, so this
    // table cannot drift from what the app actually offers.
    return adminNavItems.map((item) => ({
      label: item.label,
      roles: item.roles,
    }));
  }, []);

  function openCreate() {
    setDraft(EMPTY); setEditing(null); setError(undefined); setOpen(true);
  }
  function openEdit(member: StaffMember) {
    setDraft({
      name: member.name, email: member.email, phone: member.phone,
      role: member.role, note: member.note,
    });
    setEditing(member); setError(undefined); setOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.name.trim()) return setError("Enter a name.");
    if (!draft.email.trim()) return setError("An email is needed - it becomes the sign-in identity.");
    if (!isValidEmail(draft.email)) return setError("That is not a valid email address.");
    if (draft.phone.trim() && !isValidPakistaniPhone(draft.phone)) {
      return setError("That is not a valid Pakistani phone number.");
    }
    const clash = staff.some(
      (s) => s.email.toLowerCase() === draft.email.trim().toLowerCase() && s.id !== editing?.id
    );
    if (clash) return setError("Another staff member already uses this email.");

    const stamp = new Date().toISOString();
    if (editing) {
      setStaff((cur) =>
        cur.map((s) =>
          s.id === editing.id
            ? { ...s, ...draft, name: draft.name.trim(), email: draft.email.trim(), updatedAt: stamp }
            : s
        )
      );
      toast.success("Staff member updated.", { description: draft.name });
    } else {
      setStaff((cur) => [
        ...cur,
        {
          id: `stf_${Math.random().toString(36).slice(2, 8)}`,
          name: draft.name.trim(),
          email: draft.email.trim(),
          phone: draft.phone.trim(),
          role: draft.role,
          status: "ACTIVE",
          note: draft.note.trim(),
          createdAt: stamp,
          updatedAt: stamp,
        },
      ]);
      toast.success("Staff member added.", {
        description: "Recorded only - they cannot sign in until Auth exists.",
      });
    }
    setOpen(false);
  }

  function toggleStatus(member: StaffMember) {
    const next: StaffStatus = member.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setStaff((cur) =>
      cur.map((s) => (s.id === member.id ? { ...s, status: next, updatedAt: new Date().toISOString() } : s))
    );
    toast.success(next === "DISABLED" ? "Staff member disabled." : "Staff member re-enabled.", {
      description: "Kept on the list - past invoices carry their name.",
    });
  }

  return (
    <>
      {/* The most important thing on this page. */}
      <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs leading-relaxed text-foreground">
        <ShieldAlert className="mt-px size-4 shrink-0 text-destructive" aria-hidden="true" />
        <span>
          <strong className="font-semibold">This is not sign-in, and it protects nothing.</strong>{" "}
          There is no authentication in the project yet: every admin page is reachable
          by anyone who types its address, and the roles below are a written plan, not
          a rule the software enforces. Hiding a menu item is not security. Real
          enforcement needs Firebase Auth with custom claims and Firestore Security
          Rules, so that a cashier physically cannot read a purchase price no matter
          what the interface shows them.
        </span>
      </p>

      <div className="mt-4 flex justify-end">
        <Button onClick={openCreate} className="h-10 gap-1.5 bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-gold-deep">
          <Plus className="size-4" aria-hidden="true" />Add Staff Member
        </Button>
      </div>

      {/* ---------------- STAFF ---------------- */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <caption className="sr-only">Staff members and their planned roles</caption>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">Name</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Email</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Phone</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Role</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Added</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff.map((s) => {
                const role = ROLE_CONFIG[s.role];
                const disabled = s.status === "DISABLED";
                return (
                  <tr key={s.id} className={cn("transition-colors hover:bg-muted/40", disabled && "opacity-60")}>
                    <th scope="row" className="px-4 py-3 text-left">
                      <span className="font-semibold text-foreground">{s.name}</span>
                      {s.note && (
                        <span className="block max-w-[16rem] truncate text-[11px] font-normal text-muted-foreground">
                          {s.note}
                        </span>
                      )}
                    </th>
                    <td className="px-3 py-3 text-muted-foreground">{s.email}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{s.phone || "—"}</td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", role.badgeClass)}>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        disabled ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                      )}>
                        {disabled ? "Disabled" : "Active"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {formatOrderDate(s.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(s)}
                          className="h-8 gap-1 px-2 text-xs">
                          <Pencil className="size-3.5" aria-hidden="true" />Edit
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => toggleStatus(s)}
                          aria-label={disabled ? `Re-enable ${s.name}` : `Disable ${s.name}`}
                          className="h-8 gap-1 px-2 text-xs">
                          {disabled ? <UserCheck className="size-3.5" aria-hidden="true" /> : <UserX className="size-3.5" aria-hidden="true" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-border lg:hidden">
          {staff.map((s) => {
            const role = ROLE_CONFIG[s.role];
            return (
              <li key={s.id} className={cn("space-y-2 p-4", s.status === "DISABLED" && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", role.badgeClass)}>
                    {role.label}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(s)} className="h-9 flex-1 text-xs">Edit</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => toggleStatus(s)} className="h-9 flex-1 text-xs">
                    {s.status === "DISABLED" ? "Enable" : "Disable"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ---------------- WHAT EACH ROLE WILL GET ---------------- */}
      <h3 className="mt-6 font-heading text-base font-bold text-foreground">
        Planned permissions
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Built from the same navigation definition the sidebar uses, so this table
        cannot drift from what the app actually offers.
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <caption className="sr-only">Which role may reach which admin page</caption>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">Page</th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className="px-3 py-2.5 text-center font-medium">
                    {ROLE_CONFIG[r].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {permissions.map((row) => (
                <tr key={row.label} className="transition-colors hover:bg-muted/40">
                  <th scope="row" className="px-4 py-2.5 text-left font-normal text-foreground">
                    {row.label}
                  </th>
                  {ROLES.map((r) => {
                    const allowed = row.roles.includes(r);
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        {allowed ? (
                          <Check className="mx-auto size-4 text-success" aria-label="Allowed" />
                        ) : (
                          <X className="mx-auto size-4 text-muted-foreground" aria-label="Not allowed" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {ROLES.map((r) => (
          <li key={r} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", ROLE_CONFIG[r].badgeClass)}>
              {ROLE_CONFIG[r].label}
            </span>
            {ROLE_CONFIG[r].summary}
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Staff are disabled, never deleted - their name appears on past invoices as the
        cashier, and removing the record would leave those invoices unexplainable.
        Changes on this page are not saved anywhere; they last until you reload, because
        a staff list that looks persistent would imply an account system that does not
        exist yet. All names and addresses here are fictional demo values.
      </p>

      {/* ---------------- ADD / EDIT ---------------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
            <DialogDescription>
              Recorded for planning. No account is created and nobody can sign in yet.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField label="Full Name" value={draft.name}
              onChange={(v) => { setDraft({ ...draft, name: v }); setError(undefined); }}
              placeholder="Ali Khan" required />
            <FormField label="Email" type="email" value={draft.email}
              onChange={(v) => { setDraft({ ...draft, email: v }); setError(undefined); }}
              placeholder="staff@example.com" required />
            <FormField label="Phone (optional)" type="tel" value={draft.phone}
              onChange={(v) => { setDraft({ ...draft, phone: v }); setError(undefined); }}
              placeholder="0300 1234567" />

            <div>
              <label htmlFor="staff-role" className="mb-1.5 block text-sm font-medium text-foreground">
                Role
              </label>
              <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as AdminRole })}>
                <SelectTrigger id="staff-role" className="h-10 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {ROLE_CONFIG[draft.role].summary}
              </p>
            </div>

            <FormField label="Note (optional)" value={draft.note}
              onChange={(v) => setDraft({ ...draft, note: v })}
              placeholder="Counter, repairs desk, shift" textarea rows={2} />

            {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10">Cancel</Button>
              <Button type="submit" className="h-10 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep">
                {editing ? "Save Changes" : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
