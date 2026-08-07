import type { Metadata } from "next";

import { loadFormContext } from "../form-data";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Yeni ürün" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const { categories, optionTypes, defaultVatRate } = await loadFormContext();

  return (
    <ProductForm
      categories={categories}
      optionTypes={optionTypes}
      defaultVatRate={defaultVatRate}
      initial={{
        name: "",
        slug: "",
        shortDesc: "",
        description: "",
        isActive: true,
        isNew: true, // yeni eklenen ürün doğal olarak "yeni"
        isFeatured: false,
        metaTitle: "",
        metaDescription: "",
        categoryIds: [],
        primaryCategoryId: null,
        images: [],
        variants: [],
      }}
    />
  );
}
