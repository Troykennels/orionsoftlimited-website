import { useEffect } from 'react';

// A press acknowledgement, never a claim that the underlying action succeeded.
export default function AdminInteractionFeedback() {
  useEffect(() => {
    const timers = new Map();
    function pressed(event) {
      const button = event.target.closest?.('.admin-workspace button');
      if (!button || button.disabled) return;
      clearTimeout(timers.get(button));
      button.classList.remove('admin-button-activated');
      void button.offsetWidth;
      button.classList.add('admin-button-activated');
      timers.set(button, setTimeout(() => { button.classList.remove('admin-button-activated'); timers.delete(button); }, 650));
    }
    document.addEventListener('click', pressed, true);
    return () => { document.removeEventListener('click', pressed, true); for (const timer of timers.values()) clearTimeout(timer); };
  }, []);
  return null;
}
