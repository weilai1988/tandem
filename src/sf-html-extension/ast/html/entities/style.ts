import { inject } from "sf-core/decorators";
import { parseCSS } from "sf-html-extension/ast";
import { NodeSection } from "sf-html-extension/dom";
import { HTMLElementEntity } from "./element";
import { EntityFactoryDependency } from "sf-core/dependencies";
import { CSSStyleSheetExpression } from "sf-html-extension/ast";
import { CSSStyleSheetsDependency } from "sf-html-extension/dependencies";
import { HTMLElementExpression, HTMLTextExpression } from "sf-html-extension/ast";

export class HTMLStyleEntity extends HTMLElementEntity {
  readonly type: string = "element";
  private _style: HTMLStyleElement;
  private _styleSheetExpression: CSSStyleSheetExpression;

  protected willSourceChange(value: HTMLElementExpression) {
    super.willSourceChange(value);
    this._removeStyles();
    const nodeValue = (<HTMLTextExpression>value.children[0]).value;

    const newStyle = parseCSS(nodeValue);

    if (this._styleSheetExpression) {
      this._styleSheetExpression.patch(newStyle);
    } else {
      this._styleSheetExpression = newStyle;
    }
  }

  didMount() {
    CSSStyleSheetsDependency.findOrRegister(this._dependencies).register(this._styleSheetExpression);
  }

  _removeStyles() {
    if (!this._styleSheetExpression) return;
    CSSStyleSheetsDependency.findOrRegister(this._dependencies).unregister(this._styleSheetExpression);
  }

  mapSourceChildNodes() {
    return [];
  }

  createSection() {
    return new NodeSection((this._style = document.createElement("style")));
  }
}

export const htmlStyleEntityDependency = new EntityFactoryDependency("style", HTMLStyleEntity);