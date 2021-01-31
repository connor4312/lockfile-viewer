import forceAtlas2 from 'graphology-layout-forceatlas2';
import { AbstractGraph } from 'graphology-types';
import { FunctionComponent, h } from 'preact';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { WebGLRenderer } from 'sigma';
import { IColorAlgorithm, IColorScheme } from './color';
import { createGraph, IPackageLock } from './graph';
import { useColors } from './useColors';
// sigma depends on this, but not all browsers have it:
window.setImmediate = window.setImmediate ?? ((fn: () => void) => setTimeout(fn, 0));

const enableDragging = (renderer: WebGLRenderer, graph: AbstractGraph) => {
  const camera = renderer.getCamera();
  const captor = renderer.getMouseCaptor();

  let draggedNode: string | undefined;
  renderer.on('downNode', e => {
    draggedNode = e.node;
    camera.disable();
  });

  captor.on('mouseup', () => {
    draggedNode = undefined;
    camera.enable();
  });

  captor.on('mousemove', (e: MouseEvent) => {
    if (!draggedNode) {
      return;
    }

    const pos = renderer.normalizationFunction.inverse(camera.viewportToGraph(renderer, e.x, e.y));
    graph.setNodeAttribute(draggedNode, 'x', pos.x);
    graph.setNodeAttribute(draggedNode, 'y', pos.y);
  });
};

export const Sigma: FunctionComponent<{
  lockfile: IPackageLock;
  colorScheme: IColorScheme;
  colorAlgorithm: IColorAlgorithm;
}> = ({ lockfile, colorScheme, colorAlgorithm }) => {
  const container = useRef<HTMLDivElement>();

  const graph = useMemo(() => {
    const graph = createGraph(lockfile);
    forceAtlas2.assign(graph, {
      iterations: 50,
      settings: {
        gravity: 10,
      },
    });
    return graph;
  }, [lockfile]);

  const colors = useColors();

  useEffect(() => {
    const getValue = colorAlgorithm.use(lockfile);
    graph.nodes().forEach(node => {
      const attrs = graph.getNodeAttributes(node);
      graph.setNodeAttribute(node, 'color', colorScheme.generate(getValue(attrs.node)) ?? '#f00');
    });
  }, [graph, colorScheme, colorAlgorithm]);

  useEffect(() => {
    if (!container.current || !colors) {
      return;
    }

    const renderer = new WebGLRenderer(graph, container.current, {
      labelFont: colors['font-family'],
      labelWeight: colors['font-weight'],
      // labelRenderer: (context, label, settings)
    });
    enableDragging(renderer, graph);
    return () => renderer.kill();
  }, [container.current, graph, colors]);

  return (
    <div
      ref={container}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        color: colors?.['editor-foreground'],
      }}
    />
  );
};
