/**
 * Translation integration (Phase 18).
 *
 * The chunked, atomic, Persian-first engine (src/lib/ai/translate-engine.ts)
 * is UNCHANGED — this module only guarantees that EVERY creation path puts
 * new opportunities into the same queue with the same pending contract:
 *
 *   translationStatus: 'pending'   legacy aggregate (recomputed by the engine)
 *   faStatus: 'pending'            Persian gate — always first
 *   psStatus: null                 never starts before faStatus === 'complete'
 *
 * Import never waits on translation availability: the orchestrator gives
 * each row a 90s budget and the background tick owns the rest; a failed
 * provider never discards the opportunity. The engine's pickNextRow works
 * on published rows, so draft-mode official sources translate the moment
 * they are published — the flags make sure they are IN the queue.
 */
export function translationPendingFlags(): {
  translationStatus: 'pending';
  faStatus: 'pending';
  psStatus: null;
} {
  return { translationStatus: 'pending', faStatus: 'pending', psStatus: null };
}
