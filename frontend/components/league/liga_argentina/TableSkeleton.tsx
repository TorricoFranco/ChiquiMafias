export const TableSkeleton = ({ rows = 10, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="bg-[#161616] rounded-2xl border border-white/5 overflow-hidden animate-pulse">
    {/* Header de la tabla ficticia */}
    <div className="h-12 bg-white/5 border-b border-white/5 flex items-center px-6 gap-4">
      <div className="h-4 bg-white/10 rounded w-8"></div>
      <div className="h-4 bg-white/10 rounded flex-1"></div>
      <div className="h-4 bg-white/10 rounded w-24"></div>
    </div>


    <div className="p-4 space-y-4">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-2">
          {/* Posición */}
          <div className="h-6 bg-white/5 rounded w-6"></div>
          {/* Logo y Nombre */}
          <div className="h-8 w-8 bg-white/5 rounded-full"></div>
          <div className="h-4 bg-white/5 rounded flex-1"></div>
          {/* Columnas de números (puntos, pj, etc) */}
          {[...Array(cols)].map((_, j) => (
            <div key={j} className="h-6 bg-white/5 rounded w-8"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
);