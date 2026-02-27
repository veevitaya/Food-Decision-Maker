import mascotImg from "@assets/toast_mascot_nobg.png";

export function LoadingMascot({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const imgSize = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-24 w-24" : "h-16 w-16";
  const hourglassSize = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl";

  return (
    <div className="flex items-center gap-2">
      <span className={`${hourglassSize} inline-block animate-spin-slow gpu-accelerated`}>⏳</span>
      <img
        src={mascotImg}
        alt="Toast mascot"
        className={`${imgSize} object-contain animate-soft-bob gpu-accelerated`}
        draggable={false}
      />
    </div>
  );
}
