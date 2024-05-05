import { describe, it, expect } from "vitest";
import { parse } from "./fixture";

describe("Parser", () => {
    describe("Statement separation", () => {
        it.each(["", "\n", "#"])("should parse empty statements", (input: string) => {
            const { nodes, errors } = parse(input);

            expect(errors).toStrictEqual([]);
            expect(nodes).toStrictEqual([]);
        });

        it("should not require a newline at EOF", () => {
            const { nodes, errors } = parse("foo = ON");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);
        });

        it("should split on newline", () => {
            const { nodes, errors, locations } = parse(`
                \x01foo = ON\x02
                \x03bar = OFF\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(2);

            expect(nodes[0].location).toStrictEqual(locations.between(1, 2));
            expect(nodes[1].location).toStrictEqual(locations.between(3, 4));
        });

        it("should split on newlines", () => {
            const { nodes, errors, locations } = parse(`
                \x01foo = ON\x02


                \x03bar = OFF\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(2);

            expect(nodes[0].location).toStrictEqual(locations.between(1, 2));
            expect(nodes[1].location).toStrictEqual(locations.between(3, 4));
        });
    });

    describe("Comments", () => {
        it("should ignore lines starting with '#'", () => {
            const { nodes, errors } = parse(`
                # baz = 123
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(0);
        });

        it("should ignore anything after '#'", () => {
            const { nodes, errors } = parse(`
                foo = bar # baz = 123
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);
        });
    });
});
