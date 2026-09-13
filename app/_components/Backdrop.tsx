import { Mark } from "./Mark";

/**
 * Oversized mark behind the page. Mobile only: on desktop the hero shows the
 * mark beside the headline instead, so a backdrop there would be a duplicate.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none
                 flex items-center justify-center lg:hidden"
    >
      <Mark className="w-[170vw] h-auto text-signal/[0.07]" />
    </div>
  );
}
