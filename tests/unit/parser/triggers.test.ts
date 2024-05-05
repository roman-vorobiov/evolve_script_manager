import { describe, it, expect } from "vitest";
import { parse } from "./fixture";

import type { Trigger, TriggerChain } from "$lib/core/dsl/parser/model";

describe("Parser", () => {
    describe("Triggers", () => {
        it("should parse inline triggers", () => {
            const { nodes, errors, maps } = parse("aaa bbb when ccc ddd");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0]).toStrictEqual(maps("aaa bbb when ccc ddd", <Trigger> {
                type: "Trigger",
                condition: maps("ccc ddd", { name: maps("ccc"), arguments: [maps("ddd")] }),
                action: maps("aaa bbb", { name: maps("aaa"), arguments: [maps("bbb")] })
            }));
        });

        it("should parse inline triggers with count", () => {
            const { nodes, errors, maps } = parse("aaa bbb (123) when ccc ddd (456)");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0]).toStrictEqual(maps("aaa bbb (123) when ccc ddd (456)", <Trigger> {
                type: "Trigger",
                condition: maps("ccc ddd (456)", { name: maps("ccc"), arguments: [maps("ddd"), maps("456", 456)] }),
                action: maps("aaa bbb (123)", { name: maps("aaa"), arguments: [maps("bbb"), maps("123", 123)] })
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

            expect(nodes[0]).toStrictEqual(maps([0x01, 0x02], <TriggerChain> {
                type: "TriggerChain",
                condition: maps("aaa bbb", { name: maps("aaa"), arguments: [maps("bbb")] }),
                actions: [
                    maps("ccc ddd", { name: maps("ccc"), arguments: [maps("ddd")] }),
                    maps("eee fff", { name: maps("eee"), arguments: [maps("fff")] })
                ]
            }));
        });
    });
});
