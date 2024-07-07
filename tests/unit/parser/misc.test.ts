import { describe, it, expect } from "vitest";
import { parseSource as parse } from "./fixture";
import { ParseError } from "$lib/core/dsl/model";

describe("Parser", () => {
    describe("Statement separation", () => {
        it.each(["", "\n", "#"])("should parse empty statements", (input) => {
            const { nodes, errors } = parse(input);

            expect(errors).toStrictEqual([]);
            expect(nodes).toStrictEqual([]);
        });

        it("should not require a newline at EOF", () => {
            const { nodes, errors } = parse("foo = ON");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);
        });

        it("should not require lines", () => {
            const { nodes, errors } = parse("");

            expect(errors).toStrictEqual([]);
            expect(nodes).toStrictEqual([]);
        });

        it("should not require statements", () => {
            const { nodes, errors } = parse(`

            `);

            expect(errors).toStrictEqual([]);
            expect(nodes).toStrictEqual([]);
        });

        it("should allow leading newlines", () => {
            const { nodes, errors } = parse(`
                foo = ON`);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect((nodes[0] as any).$source).toEqual("foo = ON");
        });

        it("should allow trailing newlines", () => {
            const { nodes, errors } = parse(`foo = ON
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect((nodes[0] as any).$source).toEqual("foo = ON");
        });

        it("should split on newline", () => {
            const { nodes, errors } = parse(`
                foo = ON
                bar = OFF
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(2);

            expect((nodes[0] as any).$source).toEqual("foo = ON");
            expect((nodes[1] as any).$source).toEqual("bar = OFF");
        });

        it("should require newlines between statements", () => {
            const { nodes, errors, locationBetween } = parse(`foo = ON \x01bar\x02 = OFF`);

            expect(nodes).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0]).toBeInstanceOf(ParseError);
            if (errors[0] instanceof ParseError) {
                expect(errors[0].message).toEqual("Unexpected 'bar'");
                expect(errors[0].location).toEqual(locationBetween(1, 2));
            }
        });

        it("should split on newlines", () => {
            const { nodes, errors } = parse(`
                foo = ON


                bar = OFF
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(2);

            expect((nodes[0] as any).$source).toEqual("foo = ON");
            expect((nodes[1] as any).$source).toEqual("bar = OFF");
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
                foo = "bar" # baz = 123
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);
        });
    });
});
