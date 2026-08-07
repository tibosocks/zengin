export interface CategoryOption {
  id: string;
  name: string;
  depth: number;
}

/**
 * Düz kategori listesini ağaç sırasına dizer ve her satıra derinlik verir.
 *
 * Neden gerekli: sortOrder her seviyede kendi içinde 0'dan başlıyor. Listeyi
 * doğrudan sortOrder'a göre sıralarsanız "Erkek Patik Çorap" (alt, sıra 0)
 * "Kadın Çorapları"ndan (üst, sıra 0) önce gelebiliyor ve açılır menü
 * anlamsız bir sırayla çıkıyor.
 */
export function buildCategoryOptions(
  rows: Array<{
    id: string;
    name: string;
    parentId: string | null;
    sortOrder?: number;
  }>,
): CategoryOption[] {
  const byParent = new Map<string | null, typeof rows>();

  for (const row of rows) {
    const list = byParent.get(row.parentId) ?? [];
    list.push(row);
    byParent.set(row.parentId, list);
  }

  for (const list of byParent.values()) {
    list.sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "tr"),
    );
  }

  const result: CategoryOption[] = [];
  const visited = new Set<string>();

  function walk(parentId: string | null, depth: number) {
    for (const row of byParent.get(parentId) ?? []) {
      // Veri bozulsa bile sonsuz döngüye girmeyelim
      if (visited.has(row.id)) continue;
      visited.add(row.id);

      result.push({ id: row.id, name: row.name, depth });
      walk(row.id, depth + 1);
    }
  }

  walk(null, 0);
  return result;
}

/** Açılır menüde girinti göstermek için. <option> CSS padding kabul etmiyor. */
export function indentOption(depth: number): string {
  return depth === 0 ? "" : `${"  ".repeat(depth)}└ `;
}
