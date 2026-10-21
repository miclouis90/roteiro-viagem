import { useId, useState, type CSSProperties } from "react";
import type { Trip } from "../types";
import { artworkVariant, tripArtworkPhoto, tripArtworkSeed, type ArtworkPhoto } from "../utils/tripArtwork";

export function TripArtwork({ trip, dayIndex, className = "" }: {
  trip: Trip;
  dayIndex?: number;
  className?: string;
}) {
  return <DestinationArtwork seed={tripArtworkSeed(trip)} dayIndex={dayIndex}
    photo={tripArtworkPhoto(trip.destinationCity, dayIndex)} className={className} />;
}

export function DestinationArtwork({ seed, dayIndex, photo, className = "" }: {
  seed: string;
  dayIndex?: number;
  photo?: ArtworkPhoto;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState("");
  const variant = artworkVariant(seed, dayIndex);
  const id = useId();
  const hasPhoto = photo && photo.src !== failedSource;
  return <div className={`trip-artwork ${dayIndex === undefined ? "trip-artwork-cover" : "trip-artwork-day"} ${hasPhoto ? "has-photo" : "is-illustrated"} ${className}`}
    data-scene={variant.scene} data-palette={variant.palette} aria-hidden="true">
    <svg className="trip-artwork-vector" viewBox={dayIndex === undefined ? "0 0 800 500" : "300 0 400 500"} preserveAspectRatio={dayIndex === undefined ? "xMaxYMid slice" : "xMidYMid slice"} focusable="false">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--art-ink)" /><stop offset="1" stopColor="var(--art-sky)" />
        </linearGradient>
        <pattern id={`${id}-windows`} width="22" height="28" patternUnits="userSpaceOnUse">
          <path d="M5 7v10M12 7v10" stroke="var(--art-paper)" strokeWidth="2" opacity=".3" />
        </pattern>
      </defs>
      <path fill={`url(#${id}-sky)`} d="M0 0h800v500H0z" />
      <circle cx={variant.sun} cy="126" r="66" fill="var(--art-sun)" />
      <circle cx={variant.sun} cy="126" r="85" fill="none" stroke="var(--art-paper)" strokeWidth=".7" opacity=".2" />
      <path d="M-40 310Q105 200 245 265T470 232T840 260V500H-40Z" fill="var(--art-distant)" />
      <path d="M-30 346Q160 270 330 325T640 300T830 315V500H-30Z" fill="var(--art-land)" />

      {variant.scene === "arches" && <g>
        <path d="M342 200h410v172H342z" fill="var(--art-stone)" />
        {[370, 445, 520, 595, 670].map(x => <path key={x} d={`M${x} 372v-65a24 24 0 0 1 48 0v65Z`} fill="var(--art-ink)" />)}
        <path d="M328 197h438M342 221h410M342 240h410M348 386h410M326 400h450" stroke="var(--art-paper)" strokeWidth="2" opacity=".5" />
        <path d="M330 381h440v15H330z" fill="var(--art-land)" />
        <path d="M600 82h50v104h-50zM615 56h20v26h-20z" fill="var(--art-stone)" />
        <path d="M623 94v63" stroke="var(--art-ink)" strokeWidth="4" />
      </g>}
      {variant.scene === "coast" && <g>
        <path d="m250 280 127-133 94 77 100-67 190 155Z" fill="var(--art-distant)" />
        <path d="m342 185 35-38 41 33-28-8-16 12Z" fill="var(--art-paper)" opacity=".6" />
        <path d="M-30 365Q140 290 330 341T840 304V500H-30Z" fill="var(--art-water)" />
        <path d="M330 490Q450 364 790 355" fill="none" stroke="var(--art-stone)" strokeWidth="30" />
        <path d="M520 332h85l-20 15h-47zM560 228v101l-42-7z" fill="var(--art-paper)" />
        <path d="m568 243 32 77h-32z" fill="var(--art-sun)" />
        <path d="M390 380h100m42-24h64m-190 52h67m84 11h100M80 402h124" stroke="var(--art-paper)" opacity=".25" strokeWidth="2" />
      </g>}
      {variant.scene === "skyline" && <g>
        <path d="M340 337V202h72V337m15 0V159h66V337m14 0V222h92V337m15 0V124h61V337m15 0V183h70V337" fill="var(--art-stone)" />
        <path d="M340 337V202h72V337m15 0V159h66V337m14 0V222h92V337m15 0V124h61V337m15 0V183h70V337" fill={`url(#${id}-windows)`} />
        <path d="M645 97v27M460 133v26M327 344h445" stroke="var(--art-paper)" strokeWidth="2" />
        <path d="M0 371h800v129H0z" fill="var(--art-water)" />
        <path d="M342 385h70m15 18h66m16-17h90m15 28h61m15-20h70M450 447h164m-220 24h129" stroke="var(--art-stone)" strokeWidth="4" opacity=".22" />
      </g>}
      {variant.scene === "hills" && <g>
        <path d="M100 500Q270 168 475 276T840 226V500Z" fill="var(--art-distant)" />
        <path d="M280 500Q464 197 610 328T850 322V500Z" fill="var(--art-land)" />
        <path d="M430 500c-180-145 270-145 170-224" stroke="var(--art-stone)" strokeWidth="15" fill="none" />
        <path d="M430 500c-180-145 270-145 170-224" stroke="var(--art-ink)" strokeWidth="1.5" strokeDasharray="4 9" fill="none" opacity=".5" />
        <path d="m350 333 20-49 20 49zm20-25 23 49h-46zm341-32 17-44 17 44zm17-23 22 46h-44z" fill="var(--art-ink)" />
        <path d="M370 334v35m358-86v29" stroke="var(--art-ink)" strokeWidth="4" />
      </g>}
      {variant.scene === "bridge" && <g>
        <path d="M0 355h800v145H0z" fill="var(--art-water)" />
        <path d="M335 337Q520 76 755 337M337 337Q520 192 755 337" fill="none" stroke="var(--art-stone)" strokeWidth="12" />
        <path d="M390 271v66m57-126v126m63-153v153m65-145v145m65-110v110m62-60v60" stroke="var(--art-paper)" strokeWidth="2" opacity=".7" />
        <path d="M315 341h470M360 352v22m355-22v22" stroke="var(--art-paper)" strokeWidth="7" />
        <path d="M367 401q145-54 361-8m-298 39q120-25 228-6m-235 27h95" stroke="var(--art-paper)" opacity=".18" fill="none" strokeWidth="2" />
      </g>}
      <path d="M60 132c140-110 174 100 305-26" fill="none" stroke="var(--art-paper)" opacity=".3" strokeWidth="1.2" strokeDasharray="4 7" />
      <circle cx="60" cy="132" r="4" fill="var(--art-paper)" opacity=".7" />
      <path d="m358 102 13-3-3 13-3-6Z" fill="var(--art-paper)" opacity=".75" />
    </svg>
    {hasPhoto && <div className="trip-artwork-photo" style={{
      backgroundImage: `url("${photo.src}")`, "--photo-size": photo.size, "--photo-position": photo.position,
    } as CSSProperties}>
      <img key={photo.src} src={photo.src} alt="" className="trip-artwork-loader" onError={() => setFailedSource(photo.src)} />
    </div>}
    <div className="trip-artwork-shade" />
  </div>;
}
