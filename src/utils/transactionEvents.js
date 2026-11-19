// Tiny pub/sub so pages that list transactions can refresh after the global
// quick-add dialog creates one, without lifting their data into a store.

const EVENT = 'goals:transactions-changed';

export function emitTransactionsChanged() {
  window.dispatchEvent(new Event(EVENT));
}

/** Subscribe; returns the unsubscribe function (fits a useEffect cleanup). */
export function onTransactionsChanged(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
