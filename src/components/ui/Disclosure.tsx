import { useEffect, useRef, type ReactNode } from "react";
export function Disclosure({
  title,
  description,
  children,
  initialOpen = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  initialOpen?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.open = initialOpen;
  }, [initialOpen]);
  return (
    <details ref={ref} className="form-section">
      <summary>
        <span>
          {title}
          {description && <small>{description}</small>}
        </span>
      </summary>
      <div className="form-grid">{children}</div>
    </details>
  );
}
export function revealInvalidField(e: React.InvalidEvent<HTMLFormElement>) {
  let parent = (e.target as HTMLElement).parentElement;
  while (parent) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
    parent = parent.parentElement;
  }
}
