import type { ComponentType, LazyExoticComponent } from "react";
import { RequireSection } from "@/features/admin/AdminAccessContext";
import type { AdminSection } from "@/features/admin/adminSections";

export function withSection(
  section: AdminSection,
  Page: ComponentType | LazyExoticComponent<ComponentType>,
) {
  function Wrapped() {
    return (
      <RequireSection section={section}>
        <Page />
      </RequireSection>
    );
  }
  Wrapped.displayName = `WithSection(${section})`;
  return Wrapped;
}
