import { describe, it, expect } from "vitest";
import { parse } from "./fixture";

import type { Trigger } from "$lib/core/dsl/parser/model";

describe("Parser", () => {
    describe("Triggers", () => {
        it("should parse inline triggers", () => {
            const { nodes, errors, maps } = parse("aaa bbb when ccc ddd");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0]).toStrictEqual(maps("aaa bbb when ccc ddd", <Trigger> {
                type: "Trigger",
                condition: maps("ccc ddd", { type: maps("ccc"), id: maps("ddd") }),
                actions: [maps("aaa bbb", { type: maps("aaa"), id: maps("bbb") })]
            }));
        });

        it("should parse inline triggers with count", () => {
            const { nodes, errors, maps } = parse("aaa bbb (123) when ccc ddd (456)");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0]).toStrictEqual(maps("aaa bbb (123) when ccc ddd (456)", <Trigger> {
                type: "Trigger",
                condition: maps("ccc ddd (456)", { type: maps("ccc"), id: maps("ddd"), count: maps("456", 456) }),
                actions: [maps("aaa bbb (123)", { type: maps("aaa"), id: maps("bbb"), count: maps("123", 123) })]
            }));
        });

        it("should parse block triggers", () => {
            const { nodes, errors, maps } = parse(`
                \x01when aaa bbb do
                    ccc ddd
                    eee fff
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0]).toStrictEqual(maps([0x01, 0x02], <Trigger> {
                type: "Trigger",
                condition: maps("aaa bbb", { type: maps("aaa"), id: maps("bbb") }),
                actions: [
                    maps("ccc ddd", { type: maps("ccc"), id: maps("ddd") }),
                    maps("eee fff", { type: maps("eee"), id: maps("fff") })
                ]
            }));
        });
    });
});
