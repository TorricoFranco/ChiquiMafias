let sequence = 0;

/** Ids legibles y únicos dentro del worker, para que los fallos sean fáciles de leer. */
export function nextId(prefix: string) {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

export const LOCAL_IMAGE = "/logo/chiqui-mafias-logo.png";
