/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

// tslint:disable:only-arrow-functions
//    Mocha discourages using arrow functions, see https://mochajs.org/#arrow-functions

import { assert } from "chai";
import { Expr, JsonExpr, MapEnv, Value, ValueMap } from "../lib/Expr";
import { PartialExprEvaluator } from "../lib/PartialExprEvaluator";

describe.only("PartialExprEvaluator", function() {
    const defaultEnv = {
        on: true,
        off: false,
        someText: "some text",
        emptyText: "",
        zero: 0,
        one: 1,
        two: 2
    };

    function evaluate(expr: JsonExpr | Expr, values: ValueMap = defaultEnv) {
        const env = new MapEnv(values);
        const actualExpr =
            expr instanceof Expr
                ? expr
                : typeof expr === "string"
                ? Expr.parse(expr)
                : Expr.fromJSON(expr);

        return PartialExprEvaluator.evaluate(actualExpr, env);
    }

    function assertExprEqual(actual: JsonExpr | Expr | Value, expected: JsonExpr | Expr | Value) {
        const actualExpr = actual instanceof Expr ? actual.toJSON() : actual;
        const expectedExpr = expected instanceof Expr ? expected.toJSON() : expected;
        assert.deepEqual(actualExpr, expectedExpr);
    }

    it("basic expressions support", function() {
        assertExprEqual(evaluate(["+", 2, 2]), 4);
    });

    it("replaces `get`", function() {
        assertExprEqual(evaluate(["+", ["get", "one"], ["zoom"]]), ["+", 1, ["zoom"]]);
        assertExprEqual(evaluate(["+", ["get", "off"], ["zoom"]]), ["+", false, ["zoom"]]);
        assertExprEqual(
            evaluate([
                "+",
                ["get", "two"],
                ["interpolate", ["linear"], ["zoom"], 0, 1, 2, 10, 3, 30]
            ]),
            ["+", 2, ["interpolate", ["linear"], ["zoom"], 0, 1, 2, 10, 3, 30]]
        );
    });

    describe("operator 'all' support", function() {
        it("shortcuts 'all' if any of result evaluates to false", function() {
            assertExprEqual(evaluate(["all", 0, ["zoom"]]), false);
            assertExprEqual(evaluate(["all", ["zoom"], 0]), false);
        });
    });
    describe("operator 'any' support", function() {
        it("shortcuts 'any' if any of result evaluates to true", function() {
            assertExprEqual(evaluate(["any", 22, ["zoom"]]), true);
            assertExprEqual(evaluate(["any", ["zoom"], 33]), true);
        });
    });
});
