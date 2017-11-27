import { PCElement, PCParent, PCExpression } from "./ast";
import { Mutation } from "source-mutation";

export const PC_REMOVE_CHILD_NODE = "PC_REMOVE_CHILD_NODE";
export const PC_REMOVE_NODE = "PC_REMOVE_NODE";

export type PCRemoveChildNodeMutation = {
  index: number;
} & Mutation<PCParent>;


export type PCRemoveNodeMutation = {
} & Mutation<PCExpression>;

export const createPCRemoveChildNodeMutation = (target: PCParent, index: number): PCRemoveChildNodeMutation => ({
  type: PC_REMOVE_CHILD_NODE,
  index,
  target
});


export const createPCRemoveNodeMutation = (target: PCExpression): PCRemoveNodeMutation => ({
  type: PC_REMOVE_NODE,
  target
});