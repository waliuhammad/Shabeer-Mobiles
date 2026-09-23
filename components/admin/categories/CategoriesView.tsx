"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Tags, Plus, Pencil, Trash2, Package, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormField } from "@/components/shared/FormField";
import { useCatalog } from "@/context/CatalogContext";
import { getCategoryUsage, slugify, validateCategory } from "@/lib/catalog-utils";
import { cn } from "@/lib/utils";
import type { Category, CategoryErrors, CategoryFormData } from "@/types";

const EMPTY: CategoryFormData = { name: "", slug: "", description: "" };

/**
 * /admin/categories.
 *
 * Categories are small and few, so they are edited in a dialog rather
 * than on their own pages - a full route per category would be more
 * navigation than the task deserves.
 *
 * A category with products behind it CANNOT be deleted. Every one of
 * those products carries categoryId, categorySlug and categoryName, so
 * removing the category would leave them pointing at nothing and the
 * storefront filter would quietly return an empty shelf.
 */
export function CategoriesView() {
  const { categories, products, createCategory, updateCategory, removeCategory } = useCatalog();

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [data, setData] = useState<CategoryFormData>(EMPTY);
  const [errors, setErrors] = useState<CategoryErrors>({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const usage = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getCategoryUsage>>();
    for (const c of categories) map.set(c.id, getCategoryUsage(c.id, products));
    return map;
  }, [categories, products]);

  const isOpen = creating || editing !== null;

  function openCreate() {
    setData(EMPTY); setErrors({}); setSlugTouched(false);
    setEditing(null); setCreating(true);
  }
  function openEdit(category: Category) {
    setData({ name: category.name, slug: category.slug, description: category.description });
    setErrors({}); setSlugTouched(true);
    setCreating(false); setEditing(category);
  }
  function close() {
    setCreating(false); setEditing(null); setErrors({});
  }

  const set = <K extends keyof CategoryFormData>(field: K, value: CategoryFormData[K]) => {
    const next = { ...data, [field]: value };
    // Slug follows the name only while creating. On an existing category
    // the slug is a public URL (/shop?category=chargers) and every saved
    // link depends on it.
    if (field === "name" && !slugTouched && creating) next.slug = slugify(String(value));
    setData(next);
    setErrors(validateCategory(next, categories, editing?.id));
  };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateCategory(data, categories, editing?.id);
    if (Object.keys(found).length > 0) { setErrors(found); return; }

    if (editing) {
      const slugChanged = editing.slug !== data.slug.trim();
      updateCategory(editing.id, data);
      toast.success("Category updated.", {
        description: slugChanged
          ? "The slug changed - any saved link using the old one will stop working."
          : data.name,
      });
    } else {
      const created = createCategory(data);
      toast.success("Category created.", { description: created.name });
    }
    close();
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const ok = removeCategory(pendingDelete.id);
    if (ok) toast.success("Category removed.", { description: pendingDelete.name });
    else toast.error("Cannot remove a category that still has products.");
    setPendingDelete(null);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} className="h-10 gap-1.5 bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-gold-deep">
          <Plus className="size-4" aria-hidden="true" />Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Tags className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">No categories yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Categories are the groups customers browse on the storefront.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => {
            const u = usage.get(c.id);
            return (
              <li key={c.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">/{c.slug}</p>
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    (u?.productCount ?? 0) > 0
                      ? "bg-cyan-soft text-secondary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {u?.productCount ?? 0} {u?.productCount === 1 ? "product" : "products"}
                  </span>
                </div>

                {c.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {c.description}
                  </p>
                )}

                <p className="mt-2 text-[11px] text-muted-foreground">
                  {u?.activeCount ?? 0} active on the storefront
                </p>

                <div className="mt-3 flex gap-2 pt-1">
                  <Button asChild variant="outline" size="sm" className="h-9 flex-1 gap-1 text-xs">
                    <Link href="/admin/products">
                      <Package className="size-3.5" aria-hidden="true" />Products
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(c)} className="h-9 gap-1 px-2.5 text-xs" aria-label={`Edit ${c.name}`}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setPendingDelete(c)}
                    disabled={!u?.canDelete}
                    title={u?.canDelete ? undefined : "This category still has products"}
                    aria-label={`Remove ${c.name}`}
                    className="h-9 gap-1 px-2.5 text-xs"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0 text-secondary" aria-hidden="true" />
        A category holding products cannot be removed - those products carry its id,
        slug and name, and deleting it would leave every one of them pointing at a
        category that no longer exists. Move the products first. Renaming is safe;
        changing a slug is not, because the slug is the public URL.
      </p>

      {/* ---------------- CREATE / EDIT ---------------- */}
      <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Renaming is safe. Changing the slug breaks saved links."
                : "Categories are the groups customers browse."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField
              label="Category Name" value={data.name}
              onChange={(v) => set("name", v)} error={errors.name}
              placeholder="Power Banks" required
            />
            <FormField
              label="URL Slug" value={data.slug}
              onChange={(v) => { setSlugTouched(true); set("slug", v); }}
              error={errors.slug} placeholder="power-banks" required
            />
            <FormField
              label="Description" value={data.description}
              onChange={(v) => set("description", v)}
              placeholder="What belongs in this group" textarea rows={2}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} className="h-10">Cancel</Button>
              <Button type="submit" className="h-10 bg-accent font-semibold text-accent-foreground hover:bg-gold-deep">
                {editing ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------- DELETE CONFIRMATION ---------------- */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this category?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} has no products, so removing it is safe. Any
              storefront link using /shop?category={pendingDelete?.slug} will stop
              matching.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove category</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
