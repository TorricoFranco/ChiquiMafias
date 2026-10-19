/** Bloque que pulsa mientras carga. Es decorativo: el contenedor es el que anuncia "Cargando". */
export const Skeleton = ({ className = "" }: { className?: string }) => (
    <div aria-hidden="true" className={`animate-pulse rounded-md bg-[#2a2a2a] ${className}`} />
);
