export function SectionHeading({
  eyebrow,
  title,
  sub,
  id,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  id?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p
        className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${
          dark ? "text-white/60" : "text-[#667085]"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        id={id}
        className={`mt-3 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.75rem] ${
          dark ? "text-white" : "text-[#111318]"
        }`}
      >
        {title}
      </h2>
      {sub ? (
        <p
          className={`mt-4 text-pretty text-base leading-relaxed sm:text-lg ${
            dark ? "text-white/70" : "text-[#667085]"
          }`}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}
