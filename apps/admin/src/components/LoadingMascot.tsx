import mascotImg from "@assets/toast_mascot_nobg.png";

export function LoadingMascot({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const imgSize = size === "sm" ? "h-20 w-20" : size === "lg" ? "h-40 w-40" : "h-28 w-28";

  return (
    <div className="flex items-center justify-center">
      <img
        src={mascotImg}
        alt="Toast mascot waiting"
        className={`${imgSize} object-contain animate-soft-bob gpu-accelerated`}
        style={{ mixBlendMode: "multiply" }}
        draggable={false}
      />
    </div>
  );
}
