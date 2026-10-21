import { StrobiPlayground } from "./playground";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Strobi · Interactive Avatar",
  description: "Meet Strobi — play its animations and expressions.",
};

export default function StrobiPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-[#111111]">
          Meet Strobi
        </h1>
        <p className="text-sm text-[#6B7280]">
          Your interactive companion — play an animation or freeze a pose.
          It blinks on its own, just like the real thing.
        </p>
      </div>
      <StrobiPlayground />
    </div>
  );
}
