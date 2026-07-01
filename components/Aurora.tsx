import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { colors } from "../lib/theme";

// Soft gradient-mesh backdrop — purple / pink / orange radial washes on cream.
// The artistic signature of the light theme. Cheap (one SVG), pointer-transparent.
export function Aurora({ intensity = 1 }: { intensity?: number }) {
  const { width, height } = useWindowDimensions();
  const o = (n: number) => String(n * intensity);
  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id="au1" cx="16%" cy="8%" rx="62%" ry="44%">
          <Stop offset="0" stopColor={colors.purple} stopOpacity={o(0.32)} />
          <Stop offset="1" stopColor={colors.purple} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="au2" cx="98%" cy="18%" rx="55%" ry="40%">
          <Stop offset="0" stopColor={colors.pink} stopOpacity={o(0.26)} />
          <Stop offset="1" stopColor={colors.pink} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="au3" cx="82%" cy="94%" rx="68%" ry="46%">
          <Stop offset="0" stopColor={colors.ember} stopOpacity={o(0.24)} />
          <Stop offset="1" stopColor={colors.ember} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#au1)" />
      <Rect x="0" y="0" width={width} height={height} fill="url(#au2)" />
      <Rect x="0" y="0" width={width} height={height} fill="url(#au3)" />
    </Svg>
  );
}
