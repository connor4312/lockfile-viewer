import {
  interpolateCividis,
  interpolateCool,
  interpolateInferno,
  interpolateMagma,
  interpolatePlasma,
  interpolateTurbo,
  interpolateViridis,
  interpolateWarm,
} from 'd3-scale-chromatic';
import { IPackageLock, IPackageLockNode } from './graph';

export interface IColorScheme {
  gradient: string;
  label: string;
  generate(percent: number): string;
}

export interface IColorAlgorithm {
  label: string;
  use(graph: IPackageLock): (node: IPackageLockNode) => number;
}

const stops = [0, 1, 2, 3, 4];

const fromChromatic = (label: string, gen: (n: number) => string): IColorScheme => ({
  label,
  gradient: `linear-gradient(${stops.map(n => gen(n / (stops.length - 1))).join(', ')})`,
  generate: gen,
});

export const colorAlgorithms: IColorAlgorithm[] = [
  {
    label: 'By depth',
    use: graph => {
      let maxDepth = 0;
      const queue: IPackageLockNode[][] = [[graph]];
      while (queue.length) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const node of queue.pop()!) {
          if (isFinite(node.depth)) {
            maxDepth = Math.max(maxDepth, node.depth);
          }

          if (node.dependencies) {
            queue.push(Object.values(node.dependencies));
          }
        }
      }

      return node => node.depth / maxDepth;
    },
  },
];

export const colorSchemes: IColorScheme[] = [
  fromChromatic('Viridis', interpolateViridis),
  fromChromatic('Turbo', interpolateTurbo),
  fromChromatic('Inferno', interpolateInferno),
  fromChromatic('Magma', interpolateMagma),
  fromChromatic('Plasma', interpolatePlasma),
  fromChromatic('Cividis', interpolateCividis),
  fromChromatic('Warm', interpolateWarm),
  fromChromatic('Cool', interpolateCool),
];
