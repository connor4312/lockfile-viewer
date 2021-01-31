import { useEffect, useState } from 'preact/hooks';
import { ColorMap, observeColors } from 'vscode-webview-tools';

export const useColors = () => {
  const [colors, setColors] = useState<ColorMap | undefined>(undefined);
  useEffect(() => observeColors(setColors), []);
  return colors;
};
