/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    BooleanLiteralExpr,
    CallExpr,
    CaseExpr,
    ContainsExpr,
    Env,
    Expr,
    ExprVisitor,
    HasAttributeExpr,
    LiteralExpr,
    MatchExpr,
    MatchLabel,
    NullLiteralExpr,
    NumberLiteralExpr,
    ObjectLiteralExpr,
    StringLiteralExpr,
    Value,
    VarExpr
} from "./Expr";

export function isLiteralExpr(expr: Expr): expr is LiteralExpr {
    return expr instanceof LiteralExpr;
}

export class PartialExprEvaluatorContext {
    constructor(
        readonly evaluator: PartialExprEvaluator,
        readonly env: Env,
        readonly cache?: Map<Expr, Value>
    ) {}

    evaluate(expr: Expr | undefined) {
        if (expr !== undefined) {
            return expr.accept(this.evaluator, this);
        }
        throw new Error("Failed to evaluate expression");
    }
}

export class PartialExprEvaluator implements ExprVisitor<Expr, PartialExprEvaluatorContext> {
    static evaluate(expr: Expr, env: Env, cache?: Map<Expr, Value>): Expr {
        return expr.accept(instance, new PartialExprEvaluatorContext(instance, env, cache));
    }

    visitVarExpr(expr: VarExpr, context: PartialExprEvaluatorContext): Expr {
        const value = context.env.lookup(expr.name);
        return Expr.fromJSON(value !== undefined ? value : null);
    }

    visitNullLiteralExpr(expr: NullLiteralExpr, context: PartialExprEvaluatorContext): Expr {
        return expr;
    }

    visitBooleanLiteralExpr(expr: BooleanLiteralExpr, context: PartialExprEvaluatorContext): Expr {
        return expr;
    }

    visitNumberLiteralExpr(expr: NumberLiteralExpr, context: PartialExprEvaluatorContext): Expr {
        return expr;
    }

    visitStringLiteralExpr(expr: StringLiteralExpr, context: PartialExprEvaluatorContext): Expr {
        return expr;
    }

    visitObjectLiteralExpr(expr: ObjectLiteralExpr, context: PartialExprEvaluatorContext): Expr {
        return expr;
    }

    visitHasAttributeExpr(expr: HasAttributeExpr, context: PartialExprEvaluatorContext): Expr {
        return Expr.fromJSON(context.env.lookup(expr.name) !== undefined);
    }

    visitContainsExpr(expr: ContainsExpr, context: PartialExprEvaluatorContext): Expr {
        const value = expr.value.accept(this, context);

        const somethingUpdated = value !== expr.value;
        const canEvaluateNow = isLiteralExpr(value);

        if (somethingUpdated) {
            expr = new ContainsExpr(value, expr.elements);
        }
        if (!canEvaluateNow) {
            return expr;
        }

        const result = expr.elements.includes(value);

        // if (context.cache !== undefined) {
        //     context.cache.set(expr, result);
        // }

        return Expr.fromJSON(result);
    }

    visitMatchExpr(match: MatchExpr, context: PartialExprEvaluatorContext): Expr {
        const newValue = context.evaluate(match.value);
        let somethingUpdated = match.value !== newValue;

        const newBranches = match.branches.map(branchEntry => {
            const [label, branchBody] = branchEntry;
            const newBody = context.evaluate(branchBody);
            somethingUpdated = somethingUpdated || newBody !== branchBody;
            return [label, newBody] as [MatchLabel, Expr];
        });
        const newFallback = context.evaluate(match.fallback);

        if (somethingUpdated) {
            match = new MatchExpr(newValue, newBranches, newFallback);
        }
        if (!isLiteralExpr(newValue)) {
            return match;
        }
        const actualValue = newValue.value;

        for (const [label, body] of match.branches) {
            if (Array.isArray(label) && (label as any[]).includes(actualValue)) {
                return body;
            } else if (label === actualValue) {
                return body;
            }
        }
        return newFallback;
    }

    visitCaseExpr(match: CaseExpr, context: PartialExprEvaluatorContext): Expr {
        for (const [condition, body] of match.branches) {
            if (context.evaluate(condition)) {
                return context.evaluate(body);
            }
        }
        return context.evaluate(match.fallback);
    }

    visitCallExpr(expr: CallExpr, context: PartialExprEvaluatorContext): Expr {
        // TODO: Invent some proper API for not-avaliable in this context operators
        if (expr.op === "zoom" || expr.op === "linear") {
            return expr;
        }
        let somethingUpdated = false;
        let allChildrenLiteral = true;
        const newChildren = expr.children.map(child => {
            const newChild = context.evaluate(child);
            somethingUpdated = somethingUpdated || newChild !== child;
            allChildrenLiteral = allChildrenLiteral && isLiteralExpr(newChild);
            return newChild;
        });
        if (somethingUpdated) {
            expr = new CallExpr(expr.op, newChildren);
        }
        switch (expr.op) {
            case "all": {
                for (const childExpr of expr.children) {
                    if (isLiteralExpr(childExpr) && !childExpr.value) {
                        return BooleanLiteralExpr.falseInstance;
                    }
                }
                if (allChildrenLiteral) {
                    return BooleanLiteralExpr.trueInstance;
                }
                return expr;
            }
            case "any": {
                for (const childExpr of expr.children) {
                    if (isLiteralExpr(childExpr) && childExpr.value) {
                        return BooleanLiteralExpr.trueInstance;
                    }
                }
                if (allChildrenLiteral) {
                    return BooleanLiteralExpr.falseInstance;
                }
                return expr;
            }

            case "none": {
                if (!allChildrenLiteral) {
                    return expr;
                }

                for (const childExpr of expr.children) {
                    if ((childExpr as LiteralExpr).value) {
                        return BooleanLiteralExpr.falseInstance;
                    }
                }
                return BooleanLiteralExpr.trueInstance;
            }

            default: {
                // if (context.cache !== undefined) {
                //     const v = context.cache.get(expr);
                //     if (v !== undefined) {
                //         return v;
                //     }
                // }
                if (!allChildrenLiteral) {
                    return expr;
                }
                return Expr.fromJSON(expr.evaluate(context.env, context.cache));
            }
        } // switch
    }
}

const instance = new PartialExprEvaluator();
