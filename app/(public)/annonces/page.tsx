import { Suspense } from "react";
import AnnoncesContent from "./AnnoncesContent";

export default function AnnoncesPage() {
  return (
    <Suspense fallback={null}>
      <AnnoncesContent />
    </Suspense>
  );
}
