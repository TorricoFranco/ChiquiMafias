"use client";

import { PanelResizeHandle } from "react-resizable-panels";
import clsx from "clsx";

export default function ResizeHandle({ direction }: { direction: "horizontal" | "vertical" }) {
  const isHorizontal = direction === "horizontal";

  return (
    <PanelResizeHandle
      className={clsx(
        "group relative flex items-center justify-center bg-transparent transition-all",
        // Área táctil pequeña para que no se pueda arrastrar "por fuera" de la barrita
        isHorizontal ? "w-[4px]" : "h-[4px]",
        // El cursor se maneja ahora por el CSS global para evitar conflictos
      )}
    >
      {/* La barrita visual */}
      <div
        className={clsx(
          "bg-[#444] rounded-full transition-all duration-200",
          isHorizontal
            ? "w-[2px] h-12 group-hover:h-full group-active:h-full"
            : "h-[2px] w-12 group-hover:w-full group-active:w-full",
          // Color azul cuando pasas el mouse o haces click
          "group-hover:bg-sky-500 group-active:bg-sky-400"
        )}
      />
    </PanelResizeHandle>
  );
}