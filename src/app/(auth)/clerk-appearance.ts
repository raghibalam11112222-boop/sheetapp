/**
 * Shared Clerk component styling so sign-in/up match the SheetApp design
 * (dark primary buttons, 8px radius, Inter). Safe to extend with `layout`
 * or `variables` — never put secrets here.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#111318",
    colorText: "#111318",
    colorTextSecondary: "#667085",
    borderRadius: "8px",
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    card: "shadow-sm",
  },
} as const;
