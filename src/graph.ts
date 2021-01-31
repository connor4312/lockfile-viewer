import { DirectedGraph } from 'graphology';
import { AbstractGraph } from 'graphology-types';
import * as semver from 'semver';

export interface IPackageLockNode {
  version: string;
  depth: number;
  name: string;
  dependentNodes: IPackageLockNode[];
  dependencyNodes: IPackageLockNode[];

  requires?: { [name: string]: string };
  dependencies?: { [name: string]: IDependency };
}

interface IDependency extends IPackageLockNode {
  resolved: string;
  integrity: string;
  dev: boolean;
}

export interface IPackageLock extends IPackageLockNode {
  lockfileVersion: string;
}

export interface INodeAttributes {
  label: string;
  x: number;
  y: number;
  depth: number;
  node: IPackageLockNode;
  size?: number;
  color?: string;
}

const getNodeOptions = (name: string, node: IPackageLockNode): INodeAttributes => {
  const angle = Math.random() * 2 * Math.PI;
  const distance = isFinite(node.depth) ? node.depth : 1;

  return {
    label: `${name}@${node.version}`,
    depth: node.depth,
    node,
    x: Math.sin(angle) * distance,
    y: Math.cos(angle) * distance,
  };
};

/**
 * Creates a graph for the package-lock structure.
 */
export const createGraph = (packageLock: IPackageLock): AbstractGraph<INodeAttributes> => {
  const graph = (new DirectedGraph() as unknown) as AbstractGraph<INodeAttributes>;
  const path: [name: string, n: IPackageLockNode][] = [];
  const edgesToAdd: [from: string, to: string][] = [];

  /** Gets the node ID for the current path */
  const getIdForCurrent = () => path.map(([name]) => name).join('/');

  /** Gets the ID of a require solved for the current node in the 'path' list */
  const getNodeIdOfRequire = (name: string, constraint: string) => {
    for (let i = path.length - 1; i >= 0; i--) {
      const [, node] = path[i];
      const pdep = node.dependencies?.[name];
      if (pdep && semver.satisfies(pdep.version, constraint)) {
        return path
          .slice(0, i + 1)
          .map(([name]) => name)
          .concat(name)
          .join('/');
      }
    }
  };

  /** Recursive function to add a dependency and its requires to the graph */
  const addNodes = (name: string, node: IPackageLockNode) => {
    path.push([name, node]);

    const thisId = getIdForCurrent();
    graph.addNode(thisId, getNodeOptions(name, node));

    if (node.dependencies) {
      for (const [name, subdeb] of Object.entries(node.dependencies)) {
        addNodes(name, subdeb);
      }
    }

    if (node.requires) {
      for (const [name, constraint] of Object.entries(node.requires)) {
        const depId = getNodeIdOfRequire(name, constraint);
        if (depId) {
          edgesToAdd.push([thisId, depId]);
        }
      }
    }

    path.pop();
  };

  addNodes(packageLock.name, packageLock);
  for (const [from, to] of edgesToAdd) {
    graph.addEdge(from, to);
  }

  return graph;
};
