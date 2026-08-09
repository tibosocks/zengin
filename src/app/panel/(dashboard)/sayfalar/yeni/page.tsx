import type { Metadata } from "next";

import { PageEditor } from "../page-editor";

export const metadata: Metadata = { title: "Yeni sayfa" };

export default function NewPagePage() {
  return (
    <PageEditor
      initial={{
        title: "",
        slug: "",
        contentHtml: "",
        isActive: true,
        metaTitle: "",
        metaDescription: "",
      }}
    />
  );
}
