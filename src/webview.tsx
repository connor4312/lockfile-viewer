import { FunctionComponent, h, render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import * as semver from 'semver';
import { colorAlgorithms, colorSchemes as colorSchemes } from './color';
import { IPackageLock, IPackageLockNode } from './graph';
import { Sigma } from './sigma';

const assignDepth = (root: IPackageLock) => {
  const queue: IPackageLockNode[][] = [[root]];
  root.depth = 0;

  const seen = new Set();
  while (queue.length) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for (const node of queue.pop()!) {
      if (seen.has(node)) {
        continue;
      }

      for (const dep of node.dependencyNodes) {
        dep.depth = Math.min(dep.depth, node.depth + 1);
      }

      seen.add(node);
      queue.push(node.dependencyNodes);
    }
  }
};

/** Adds the dependent and dependencyNodes of each item in the package.lock */
const buildDependencyChart = (root: IPackageLock) => {
  const path: IPackageLockNode[] = [];
  const leafNodes = new Set<IPackageLockNode>();

  const getRequiredNode = (name: string, constraint: string) => {
    for (let i = path.length - 1; i >= 0; i--) {
      const pdep = path[i].dependencies?.[name];
      if (pdep && semver.satisfies(pdep.version, constraint)) {
        return pdep;
      }
    }
  };

  const recurse = (name: string, node: IPackageLockNode) => {
    path.push(node);
    node.name = name;
    node.dependentNodes = [];
    node.dependencyNodes = [];
    node.depth = Infinity;

    if (node.dependencies) {
      for (const [name, subdeb] of Object.entries(node.dependencies)) {
        recurse(name, subdeb);
      }
    }

    const requires = node.requires && Object.entries(node.requires);
    if (!requires?.length) {
      leafNodes.add(node);
    } else {
      for (const [name, constraint] of requires) {
        const dep = getRequiredNode(name, constraint);
        if (dep) {
          node.dependencyNodes.push(dep);
          if (dep.dependentNodes) {
            dep.dependentNodes.push(node);
          } else {
            dep.dependentNodes = [node];
          }
        }
      }
    }

    path.pop();
  };

  recurse(root.name, root);
};

/**
 * The package.lock doesn't actually indicate what are direct dependencies
 * declared in the package.json. This fills in "requires" so that
 */
const tryFillRequires = (lockfile: IPackageLock, packageJson: string | undefined) => {
  if (!packageJson) {
    return false;
  }

  try {
    const parsed = JSON.parse(packageJson);
    lockfile.requires = {
      ...parsed.dependencies,
      ...parsed.devDependencies,
    };
    return true;
  } catch {
    return false;
  }
};

const Root: FunctionComponent = () => {
  const [lockfile, setLockfile] = useState<IPackageLock | undefined>(undefined);
  const [algorithm] = useState(colorAlgorithms[0]);
  const [color] = useState(colorSchemes[0]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'update':
          const lock: IPackageLock = JSON.parse(message.text);
          if (!tryFillRequires(lock, message.packageJson)) {
            lock.requires = {};
            for (const [name, { version }] of Object.entries(lock.dependencies ?? {})) {
              lock.requires[name] = version;
            }
          }

          buildDependencyChart(lock);
          assignDepth(lock);
          setLockfile(lock);
          return;
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  return (
    <div>
      {lockfile && <Sigma lockfile={lockfile} colorScheme={color} colorAlgorithm={algorithm} />}
    </div>
  );
};

render(<Root />, document.body);
