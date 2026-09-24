// Decorative route, deliberately not a geographic map.
export function RouteArtwork() {
  return (
    <svg
      className="route-artwork"
      viewBox="0 0 360 260"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="240" cy="80" r="100" className="art-wash" />
      <circle cx="265" cy="180" r="50" className="art-wash-small" />
      <path
        d="M38 217C45 149 148 249 174 160S98 75 150 43s99 66 158 19"
        className="art-route"
      />
      <circle cx="38" cy="217" r="9" className="art-stop" />
      <circle cx="174" cy="160" r="9" className="art-stop art-stop-coral" />
      <circle cx="150" cy="43" r="9" className="art-stop art-stop-purple" />
      <circle cx="308" cy="62" r="9" className="art-stop" />
    </svg>
  );
}
