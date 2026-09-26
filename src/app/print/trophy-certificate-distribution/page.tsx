import { redirect } from "next/navigation";

export default async function AliasPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  redirect(`/print/distribution-sheet?${params.toString()}`);
}
