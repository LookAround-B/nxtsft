"use client";
import { CSSProperties } from "react";
import { useReveal, UseRevealOptions } from "@/lib/useReveal";

type Direction = "up" | "left" | "right" | "scale" | "fade";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: Direction;
  as?: React.ElementType;
  reveal?: UseRevealOptions;
}

/* Wraps any block with a scroll-triggered reveal animation.
   CSS is driven by [data-reveal] + [data-visible] selectors in globals.css. */
export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  as: Tag = "div",
  reveal,
}: RevealProps) {
  const { ref, visible } = useReveal(reveal);

  const style: CSSProperties = {};
  if (delay > 0 && visible) style.transitionDelay = `${delay}ms`;

  return (
    <Tag
      ref={ref}
      data-reveal={direction === "up" ? "" : direction}
      {...(visible ? { "data-visible": "" } : {})}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}
