import { useRef } from "react";
import { useLocation, useNavigationType, useSearchParams, type NavigateOptions } from "react-router-dom";

// React Router's search-param setter doesn't queue functional updates. Keep one
// pending draft for fast, independent controls until their navigation commits.
export function useMergedSearchParams() {
  const [params, setParams] = useSearchParams();
  const location = useLocation(), navigationType = useNavigationType();
  const latest = useRef(new URLSearchParams(params)), pending = useRef(false), seen = useRef(location.key);
  if (seen.current !== location.key) {
    seen.current = location.key;
    if (!pending.current || navigationType === "POP" || params.toString() === latest.current.toString()) {
      latest.current = new URLSearchParams(params); pending.current = false;
    }
  }
  function update(change: (params: URLSearchParams) => URLSearchParams, options?: NavigateOptions) {
    const next = change(new URLSearchParams(latest.current));
    latest.current = new URLSearchParams(next); pending.current = true;
    setParams(next, options);
  }
  return { params, update, current: () => new URLSearchParams(latest.current) };
}
