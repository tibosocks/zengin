import "server-only";

import { buildCategoryOptions, type CategoryOption } from "@/lib/category-tree";
import { kurusToDecimalString, toKurus } from "@/lib/price";
import { prisma } from "@/lib/prisma";

import type { OptionTypeData } from "./variant-editor";

/** Ürün formunun ihtiyaç duyduğu ortak veriler. */
export async function loadFormContext(): Promise<{
  categories: CategoryOption[];
  optionTypes: OptionTypeData[];
  defaultVatRate: string;
}> {
  const [categories, optionTypes, vatSetting] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, parentId: true, sortOrder: true },
    }),
    prisma.optionType.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        values: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, value: true },
        },
      },
    }),
    prisma.setting.findUnique({ where: { key: "defaultVatRate" } }),
  ]);

  return {
    categories: buildCategoryOptions(categories),
    optionTypes,
    defaultVatRate: vatSetting?.value ?? "10",
  };
}

export function priceToInput(value: unknown): string {
  return kurusToDecimalString(toKurus(value));
}
