"use client";

import { PanelResizeHandle } from "react-resizable-panels";
import clsx from "clsx";

export default function ResizeHandle({ direction }: { direction: "horizontal" | "vertical" }) {
  const isHorizontal = direction === "horizontal";

  return (
    <PanelResizeHandle
      className={clsx(
        "group relative flex items-center justify-center bg-transparent",
        // área clickeable mínima (NO demasiado grande)
        isHorizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"
      )}
    >
      <div
        className={clsx(
          "absolute bg-[#444] rounded-full",
          isHorizontal
            ? "w-1 h-full group-hover:bg-[#666]"
            : "h-1 w-full group-hover:bg-[#666]"
        )}
      />
    </PanelResizeHandle>
  );
}