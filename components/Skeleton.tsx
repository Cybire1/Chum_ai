import React from "react";

import { Shimmer } from "../lib/motion";

// Moving-sheen skeleton (reads ~20% faster than spinners and feels premium).
export function Skeleton({
  width = "100%",
  height = 16,
  rounded,
}: {
  width?: number | `${number}%`;
  height?: number;
  rounded?: number;
}) {
  return <Shimmer width={width} height={height} radius={rounded} />;
}
