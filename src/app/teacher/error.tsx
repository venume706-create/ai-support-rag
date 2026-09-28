"use client";

import { ErrorView } from "@/components/common/error-view";

export default function SectionError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView reset={reset} />;
}
