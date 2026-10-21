const CATEGORIES = [
  "Operations",
  "Sales",
  "Inventory",
  "Projects",
  "Customers",
  "Finance",
];

export function TrustStrip() {
  return (
    <section
      aria-label="Teams SheetApp is built for"
      className="border-y border-[rgba(0,0,0,0.08)] bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-6 text-center sm:px-6">
        <p className="text-[13px] font-medium text-[#667085]">
          Built for businesses that have outgrown spreadsheets.
        </p>
        <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {CATEGORIES.map((category, i) => (
            <li key={category} className="flex items-center gap-2">
              {i > 0 ? (
                <span aria-hidden className="h-1 w-1 rounded-full bg-[rgba(0,0,0,0.16)]" />
              ) : null}
              <span className="px-1 py-1 text-sm font-semibold text-[#111318]">{category}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
