import { useEffect, useRef, useState } from 'react';

const SHOW_NEAR_TOP = 24;
const MIN_DELTA = 6;
// El plegado reflowea el contenedor y puede disparar un scroll falso: se ignora mientras dura la transición.
const SETTLE_MS = 350;

/**
 * Devuelve true cuando el usuario baja el scroll y false cuando lo sube.
 * Escucha el scroll de cualquier contenedor grande (la app scrollea en divs internos,
 * no en window) e ignora listas chicas como el chat o los carruseles.
 */
export function useHideOnScroll(resetKey?: string) {
  const [hidden, setHidden] = useState(false);
  const lastChange = useRef(0);

  // Al cambiar de vista el contenedor con scroll se reemplaza y no llega ningún evento: se vuelve a mostrar.
  const [prevKey, setPrevKey] = useState(resetKey);
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setHidden(false);
  }

  useEffect(() => {
    const lastTop = new WeakMap<EventTarget, number>();

    const onScroll = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      if (el.clientHeight < window.innerHeight * 0.5) return;

      const top = el.scrollTop;
      if (Date.now() - lastChange.current < SETTLE_MS) {
        lastTop.set(el, top);
        return;
      }
      const prev = lastTop.get(el) ?? top;
      const delta = top - prev;

      if (top <= SHOW_NEAR_TOP) {
        lastTop.set(el, top);
        setHidden((h) => {
          if (h) lastChange.current = Date.now();
          return false;
        });
        return;
      }
      if (Math.abs(delta) < MIN_DELTA) return;

      lastTop.set(el, top);
      setHidden((h) => {
        if (h !== delta > 0) lastChange.current = Date.now();
        return delta > 0;
      });
    };

    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, []);

  return hidden;
}
