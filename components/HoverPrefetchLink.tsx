"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

// A link that loads its whole page in the background as soon as the pointer
// reaches it (or a finger touches it), so the click that follows opens it from
// memory. A list with dozens of these must not prefetch every page up front,
// which is what prefetch={true} would do for links merely in view.
export function HoverPrefetchLink(props: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [armed, setArmed] = useState(false);
  const arm = () => setArmed(true);
  return (
    <Link
      {...props}
      prefetch={armed ? true : false}
      onMouseEnter={(event) => {
        arm();
        props.onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        arm();
        props.onTouchStart?.(event);
      }}
      onFocus={(event) => {
        arm();
        props.onFocus?.(event);
      }}
    />
  );
}
