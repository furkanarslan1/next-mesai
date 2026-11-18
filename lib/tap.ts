import type { MouseEvent, PointerEvent } from "react";

/**
 * "Hayalet dokunma" filtresi. Menüden sayfa değişince, parmağın altına gelen yeni sayfadaki butona
 * tarayıcı bazen artık bir tıklama gönderir (ör. Ana sayfaya geçince 2.5 saat butonu çalışır).
 * Gerçek dokunuşta aynı butona önce `pointerdown` düşer; hayalet tıklamada düşmez.
 * Klavye ile (Enter/Boşluk) tetikleme (detail === 0) her zaman geçer.
 */
const downAt = new WeakMap<EventTarget, number>();
const WINDOW_MS = 2000;

export function realTap(handler: () => void) {
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => { downAt.set(e.currentTarget, Date.now()); },
    onClick: (e: MouseEvent<HTMLElement>) => {
      const t = downAt.get(e.currentTarget);
      downAt.delete(e.currentTarget);
      if (e.detail !== 0 && (t === undefined || Date.now() - t > WINDOW_MS)) return;
      handler();
    },
  };
}
