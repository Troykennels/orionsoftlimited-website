import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './floatingOffice.css';

export default function FloatingOfficeLauncher({ scope, children }) {
  const dock = useRef(null), drag = useRef(null);
  const storageKey = `orion-office-position:${scope}`;

  function place(x, y, remember = false) {
    const element = dock.current;
    const view = window.visualViewport;
    const left = view?.offsetLeft || 0, top = view?.offsetTop || 0;
    const width = view?.width || window.innerWidth, height = view?.height || window.innerHeight;
    const maxX = Math.max(left + 8, left + width - element.offsetWidth - 8);
    const maxY = Math.max(top + 8, top + height - element.offsetHeight - 8);
    const nextX = Math.max(left + 8, Math.min(maxX, x));
    const nextY = Math.max(top + 8, Math.min(maxY, y));
    element.style.left = `${nextX}px`;
    element.style.top = `${nextY}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    if (remember) {
      try { localStorage.setItem(storageKey, JSON.stringify({ x: nextX, y: nextY })); } catch { /* Moving still works without preference storage. */ }
    }
  }

  useLayoutEffect(() => {
    const element = dock.current;
    let saved;
    try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { /* Use the default corner. */ }
    const initial = element.getBoundingClientRect();
    place(Number.isFinite(saved?.x) ? saved.x : initial.x, Number.isFinite(saved?.y) ? saved.y : initial.y);
    const fit = () => {
      const bounds = element.getBoundingClientRect();
      place(bounds.x, bounds.y);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('scroll', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('scroll', fit);
    };
  // The scope identifies this dock for its lifetime; the parent remounts it when that changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function finish(event) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    dock.current.removeAttribute('data-dragging');
    const bounds = dock.current.getBoundingClientRect();
    place(bounds.x, bounds.y, true);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return createPortal(<div ref={dock} className="or-office-launcher or-office-floating" aria-label="Office tools">
    <button type="button" className="or-office-drag" aria-label="Move office tools" title="Drag to move. Arrow keys move; Home resets position."
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return;
        const bounds = dock.current.getBoundingClientRect();
        drag.current = { id: event.pointerId, x: event.clientX - bounds.x, y: event.clientY - bounds.y };
        event.currentTarget.setPointerCapture(event.pointerId);
        dock.current.setAttribute('data-dragging', 'true');
      }}
      onPointerMove={event => {
        if (drag.current?.id === event.pointerId) place(event.clientX - drag.current.x, event.clientY - drag.current.y);
      }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
      onKeyDown={event => {
        const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (event.key === 'Home') {
          event.preventDefault();
          place(window.innerWidth - dock.current.offsetWidth - 20, window.innerHeight - dock.current.offsetHeight - (window.innerWidth <= 600 ? 76 : 22), true);
        } else if (moves[event.key]) {
          event.preventDefault();
          const bounds = dock.current.getBoundingClientRect(), step = event.shiftKey ? 40 : 10;
          place(bounds.x + moves[event.key][0] * step, bounds.y + moves[event.key][1] * step, true);
        }
      }}><span aria-hidden="true">⠿</span></button>
    {children}
  </div>, document.body);
}
