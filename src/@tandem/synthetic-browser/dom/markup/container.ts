import { DOMNodeType } from "./node-types";
import { SyntheticDOMNode, SyntheticDOMNodeEdit } from "./node";
import { SyntheticDOMText } from "./text-node";
import { isDOMMutationEvent, DOMNodeEvent } from "@tandem/synthetic-browser/messages";
import {
  diffArray,
  ITreeWalker,
  findTreeNode,
  Action,
  Mutation,
  RemoveMutation,
  MoveChildMutation,
  RemoveChildMutation,
  PropertyMutation,
  InsertChildMutation,
} from "@tandem/common";
import { getSelectorTester, ISelectorTester, querySelector, querySelectorAll } from "../selector";
import { SyntheticDOMElement } from "./element";
import {
  IContentEdit,
  ISyntheticObject,
  BaseContentEdit,
} from "@tandem/sandbox";

export namespace SyntheticDOMContainerChangeTypes {
  export const INSERT_CHILD_NODE_EDIT = "insertChildNodeEdit";
  export const REMOVE_CHILD_NODE_EDIT = "removeChildNodeEdit";
  export const MOVE_CHILD_NODE_EDIT   = "moveChildNodeEdit";
}

export class SyntheticDOMContainerEdit<T extends SyntheticDOMContainer> extends SyntheticDOMNodeEdit<T> {

  insertChild(newChild: SyntheticDOMNode, index: number) {

    // Clone child here to freeze it from any changes. It WILL be cloned again, but that's also important to ensure
    // that this edit can be applied to multiple targets.
    return this.addChange(new InsertChildMutation(SyntheticDOMContainerChangeTypes.INSERT_CHILD_NODE_EDIT, this.target, newChild.cloneNode(true), index));
  }

  removeChild(child: SyntheticDOMNode) {
    return this.addChange(new RemoveChildMutation(SyntheticDOMContainerChangeTypes.REMOVE_CHILD_NODE_EDIT, this.target, child));
  }

  moveChild(child: SyntheticDOMNode, newIndex: number) {
    return this.addChange(new MoveChildMutation(SyntheticDOMContainerChangeTypes.MOVE_CHILD_NODE_EDIT, this.target, child, newIndex));
  }

  appendChild(newChild: SyntheticDOMNode) {
    return this.insertChild(newChild, Infinity);
  }

  remove() {
    return this.addChange(new RemoveMutation(this.target));
  }

  protected addDiff(newContainer: SyntheticDOMContainer) {
    diffArray(this.target.childNodes, newContainer.childNodes, (oldNode, newNode) => {
      if (oldNode.nodeName !== newNode.nodeName) return -1;
      return 0;
    }).accept({
      visitInsert: ({ index, value }) => {
        this.insertChild(value, index);
      },
      visitRemove: ({ index }) => {
        this.removeChild(this.target.childNodes[index]);
      },
      visitUpdate: ({ originalOldIndex, patchedOldIndex, newValue, newIndex }) => {
        if (patchedOldIndex !== newIndex) {
          this.moveChild(this.target.childNodes[originalOldIndex], newIndex);
        }
        const oldValue = this.target.childNodes[originalOldIndex];
        this.addChildEdit(oldValue.createEdit().fromDiff(newValue));
      }
    });
    return super.addDiff(newContainer as T);
  }
}

export abstract class SyntheticDOMContainer extends SyntheticDOMNode {

  createEdit(): SyntheticDOMContainerEdit<any> {
    return new SyntheticDOMContainerEdit(this);
  }

  getChildSyntheticByUID(uid): ISyntheticObject {
    return findTreeNode(this, child => child.uid === uid);
  }

  // TODO - insertBefore here
  appendChild(child: SyntheticDOMNode) {
    if (child.nodeType === DOMNodeType.DOCUMENT_FRAGMENT) {
      return child.children.concat().forEach((child) => this.appendChild(child));
    }
    return super.appendChild(child);
  }

  get textContent() {
    return this.childNodes.map(child => child.textContent).join("");
  }

  set textContent(value) {
    this.removeAllChildren();
    this.appendChild(this.ownerDocument.createTextNode(value));
  }

  toString() {
    return this.childNodes.map(child => child.toString()).join("");
  }

  public querySelector(selector: string): SyntheticDOMElement {
    return querySelector(this, selector);
  }

  public querySelectorAll(selector: string): SyntheticDOMElement[] {
    return querySelectorAll(this, selector);
  }

  applyEditChange(action: Mutation<any>) {

    // TODO: Should probably use action.applyTo(this.children) instead of this stuff below
    switch(action.type) {
      case SyntheticDOMContainerChangeTypes.REMOVE_CHILD_NODE_EDIT:
        const removeAction = <InsertChildMutation<SyntheticDOMElement, SyntheticDOMNode>>action;
        this.removeChild(removeAction.findChild(this.childNodes) as SyntheticDOMNode);
      break;
      case SyntheticDOMNodeEdit.SET_SYNTHETIC_SOURCE_EDIT:
        (<PropertyMutation<any>>action).applyTo(this);
      break;
      case SyntheticDOMContainerChangeTypes.MOVE_CHILD_NODE_EDIT:
        const moveAction = <MoveChildMutation<any, SyntheticDOMNode>>action;

        this.insertChildAt(moveAction.findChild(this.childNodes), moveAction.newIndex);
      break;
      case SyntheticDOMContainerChangeTypes.INSERT_CHILD_NODE_EDIT:
        const insertAction = <InsertChildMutation<SyntheticDOMElement, SyntheticDOMNode>>action;

        // Clone again to ensure that the child can be re-added to multiple targets.
        this.insertChildAt(insertAction.child.clone(true) as SyntheticDOMNode, insertAction.index);
      break;
    }
  }

  visitWalker(walker: ITreeWalker) {
    this.childNodes.forEach(child => walker.accept(child));
  }
}

function isShadowRootOrDocument(node: SyntheticDOMNode) {
  return (node.nodeType === DOMNodeType.DOCUMENT_FRAGMENT || node.nodeType === DOMNodeType.DOCUMENT);
}