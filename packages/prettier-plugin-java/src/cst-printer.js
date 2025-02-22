"use strict";

const { BaseJavaCstVisitor } = require("java-parser");
const { ArraysPrettierVisitor } = require("./printers/arrays");
const {
  BlocksAndStatementPrettierVisitor
} = require("./printers/blocks-and-statements");
const { ClassesPrettierVisitor } = require("./printers/classes");
const { ExpressionsPrettierVisitor } = require("./printers/expressions");
const { InterfacesPrettierVisitor } = require("./printers/interfaces");
const {
  LexicalStructurePrettierVisitor
} = require("./printers/lexical-structure");
const { NamesPrettierVisitor } = require("./printers/names");
const {
  TypesValuesAndVariablesPrettierVisitor
} = require("./printers/types-values-and-variables");
const {
  PackagesAndModulesPrettierVisitor
} = require("./printers/packages-and-modules");
const {
  buildOriginalText,
  getCSTNodeStartEndToken
} = require("./printers/printer-utils");

class CstPrettierPrinter extends BaseJavaCstVisitor {
  constructor() {
    super();
    // TODO: can we ignore the optimized lookahead methods here?
    this.validateVisitor();

    // TODO: this methods should be defined on the prototype
    // defining as instance members **after** the validations to avoid
    // false positive errors on redundant methods
    this.mapVisit = (elements, params) => {
      if (elements === undefined) {
        // TODO: can optimize this by returning an immutable empty array singleton.
        return [];
      }

      return elements.map(element => this.visit(element, params), this);
    };

    this.getSingle = function(ctx) {
      const ctxKeys = Object.keys(ctx);
      if (ctxKeys.length !== 1) {
        throw Error(
          `Expecting single key CST ctx but found: <${ctxKeys.length}> keys`
        );
      }
      const singleElementKey = ctxKeys[0];
      const singleElementValues = ctx[singleElementKey];

      if (singleElementValues.length !== 1) {
        throw Error(
          `Expecting single item in CST ctx key but found: <${singleElementValues.length}> items`
        );
      }

      return singleElementValues[0];
    };

    this.visitSingle = function(ctx, params) {
      const singleElement = this.getSingle(ctx);
      return this.visit(singleElement, params);
    };

    // hack to get a reference to the inherited visit method from
    // the prototype because we cannot user "super.visit" inside the function
    // below
    const orgVisit = this.visit;
    this.visit = function(ctx, inParam) {
      if (ctx === undefined) {
        // empty Doc
        return "";
      }

      if (ctx.ignore) {
        try {
          const startEndTokens = getCSTNodeStartEndToken(ctx);
          return buildOriginalText(
            startEndTokens[0],
            startEndTokens[1],
            this.originalText
          );
        } catch (e) {
          throw Error(
            e +
              "\nThere might be a problem with prettier-ignore, please report an issue on https://github.com/jhipster/prettier-java/issues"
          );
        }
      }

      return orgVisit.call(this, ctx, inParam);
    };
  }
}

// Mixins for the win
mixInMethods(
  ArraysPrettierVisitor,
  BlocksAndStatementPrettierVisitor,
  ClassesPrettierVisitor,
  ExpressionsPrettierVisitor,
  InterfacesPrettierVisitor,
  LexicalStructurePrettierVisitor,
  NamesPrettierVisitor,
  TypesValuesAndVariablesPrettierVisitor,
  PackagesAndModulesPrettierVisitor
);

function mixInMethods(...classesToMix) {
  classesToMix.forEach(from => {
    const fromMethodsNames = Object.getOwnPropertyNames(from.prototype);
    const fromPureMethodsName = fromMethodsNames.filter(
      methodName => methodName !== "constructor"
    );
    fromPureMethodsName.forEach(methodName => {
      CstPrettierPrinter.prototype[methodName] = from.prototype[methodName];
    });
  });
}

const prettyPrinter = new CstPrettierPrinter();

// TODO: do we need the "path" and "print" arguments passed by prettier
// see https://github.com/prettier/prettier/issues/5747
function createPrettierDoc(cstNode, originalText) {
  prettyPrinter.originalText = originalText;
  return prettyPrinter.visit(cstNode);
}

module.exports = {
  createPrettierDoc
};
