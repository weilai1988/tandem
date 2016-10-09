import { ITreeNode } from "./core";

export function traverseTree<T extends ITreeNode<any>>(node: T, each: (node: T) => any) {
  if (each(node) === false) return false;
  node.children.forEach((child) => traverseTree(child, each));
};

export function filterTree<T extends ITreeNode<any>>(node: T, filter: (node: T) => boolean): T[] {
  const nodes = [];
  traverseTree(node, (child) => {
    if (filter(child)) nodes.push(child);
  });
  return nodes;
};

export function flattenTree<T extends ITreeNode<any>>(node: T) {
  return filterTree(node, child => true);
};

export function findTreeNode<T extends ITreeNode<any>>(node: T, filter: (node: T) => boolean) {
  if (filter(node)) return node;
  return node.children.find(child => findTreeNode(child, filter));
};