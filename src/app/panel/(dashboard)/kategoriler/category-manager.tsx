"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/surface";
import { deleteCategory, reorderCategories } from "@/lib/actions/categories";

import { CategoryDialog } from "./category-dialog";

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  showInMenu: boolean;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  productCount: number;
  children: CategoryNode[];
}

export function CategoryManager({ tree }: { tree: CategoryNode[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [creatingUnder, setCreatingUnder] = useState<string | null | undefined>(
    undefined,
  );
  const [message, setMessage] = useState<string | null>(null);

  const flat = flatten(tree);

  function openCreate(parentId: string | null) {
    setEditing(null);
    setCreatingUnder(parentId);
  }

  function closeDialog() {
    setEditing(null);
    setCreatingUnder(undefined);
    router.refresh();
  }

  const dialogOpen = editing !== null || creatingUnder !== undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-h-5 text-sm text-danger">{message}</div>
        <Button onClick={() => openCreate(null)}>
          <Plus className="size-4" />
          Ana kategori ekle
        </Button>
      </div>

      <Card>
        {tree.length === 0 ? (
          <EmptyState
            title="Henüz kategori yok"
            description="İlk ana kategoriyi ekleyerek başlayın."
            action={
              <Button onClick={() => openCreate(null)}>Ana kategori ekle</Button>
            }
          />
        ) : (
          <SiblingList
            parentId={null}
            items={tree}
            depth={0}
            onEdit={setEditing}
            onAddChild={openCreate}
            onError={setMessage}
          />
        )}
      </Card>

      {dialogOpen ? (
        <CategoryDialog
          category={editing}
          defaultParentId={editing ? editing.parentId : (creatingUnder ?? null)}
          allCategories={flat}
          onClose={closeDialog}
        />
      ) : null}
    </div>
  );
}

function SiblingList({
  parentId,
  items,
  depth,
  onEdit,
  onAddChild,
  onError,
}: {
  parentId: string | null;
  items: CategoryNode[];
  depth: number;
  onEdit: (node: CategoryNode) => void;
  onAddChild: (parentId: string | null) => void;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [, startTransition] = useTransition();

  // Sunucudan yeni sıra geldiğinde yerel durumu tazele
  const incomingIds = items.map((item) => item.id).join(",");
  const currentIds = order.map((item) => item.id).join(",");
  if (incomingIds !== currentIds && items.length !== order.length) {
    setOrder(items);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.findIndex((item) => item.id === active.id);
    const newIndex = order.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next); // iyimser güncelleme: sürükleme anında yerine otursun

    startTransition(async () => {
      const result = await reorderCategories(
        parentId,
        next.map((item) => item.id),
      );
      if (!result.ok) {
        setOrder(order); // geri al
        onError(result.error ?? "Sıralama kaydedilemedi.");
      } else {
        onError(null);
        router.refresh();
      }
    });
  }

  return (
    <DndContext
      // Sabit kimlik şart: her ağaç seviyesi ayrı bir DndContext ve dnd-kit
      // kimlik vermezsek artan bir sayaç kullanıyor. Sunucu ile istemcinin
      // sayaçları tutmadığı için aria-describedby hidrasyon hatası veriyor.
      id={`kategori-${parentId ?? "kok"}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={order.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul>
          {order.map((node) => (
            <CategoryRow
              key={node.id}
              node={node}
              depth={depth}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onError={onError}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function CategoryRow({
  node,
  depth,
  onEdit,
  onAddChild,
  onError,
}: {
  node: CategoryNode;
  depth: number;
  onEdit: (node: CategoryNode) => void;
  onAddChild: (parentId: string | null) => void;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  function handleDelete() {
    const label = node.name;
    if (!confirm(`"${label}" kategorisi silinsin mi?`)) return;

    startTransition(async () => {
      const result = await deleteCategory(node.id);
      if (!result.ok) {
        onError(result.error ?? "Silinemedi.");
      } else {
        onError(null);
        router.refresh();
      }
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="border-b border-line-soft last:border-0"
    >
      <div
        className="flex items-center gap-2 py-2.5 pr-4"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <button
          type="button"
          aria-label="Sürükleyerek sırala"
          className="cursor-grab touch-none rounded p-1 text-muted hover:text-ink active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{node.name}</span>
            {!node.isActive ? <Badge tone="warn">Pasif</Badge> : null}
            {!node.showInMenu ? <Badge>Menüde yok</Badge> : null}
          </div>
          <p className="text-xs text-muted">
            /{node.slug}
            {node.productCount > 0 ? ` · ${node.productCount} ürün` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddChild(node.id)}
            title="Alt kategori ekle"
          >
            <Plus className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(node)} title="Düzenle">
            <Pencil className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isPending}
            title="Sil"
            className="hover:text-danger"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {node.children.length > 0 ? (
        <SiblingList
          parentId={node.id}
          items={node.children}
          depth={depth + 1}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onError={onError}
        />
      ) : null}
    </li>
  );
}

export function flatten(
  nodes: CategoryNode[],
  depth = 0,
): Array<{ id: string; name: string; depth: number }> {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flatten(node.children, depth + 1),
  ]);
}
