"use client";


interface Props {
  activeZone: "A" | "B";
  onChange: (z: "A" | "B") => void;
}

export default function ZoneTabs({ activeZone, onChange }: Props) {
  return (
    <div className="flex bg-gray-900 rounded-lg overflow-hidden border border-gray-700 mt-2">
      <button
        onClick={() => onChange("A")}
        className={`flex-1 py-2 text-sm font-semibold transition-colors duration-150 ${
          activeZone === "A"
            ? "bg-sky-600 text-white"
            : "text-gray-400 hover:bg-gray-700"
        }`}
      >
        Zona A
      </button>

      <button
        onClick={() => onChange("B")}
        className={`flex-1 py-2 text-sm font-semibold transition-colors duration-150 ${
          activeZone === "B"
            ? "bg-sky-600 text-white"
            : "text-gray-400 hover:bg-gray-700"
        }`}
      >
        Zona B
      </button>
    </div>
  );
}
