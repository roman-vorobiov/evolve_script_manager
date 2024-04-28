import { describe, it, expect } from "vitest";
import { parse as parseImpl } from "$lib/core/dsl/parser/parse";

import type { Position, SourceLocation } from "$lib/core/dsl/parser/model";

function parse(rawSource: string) {
    const MAX_POSITION_LITERALS = 20;

    const positions: { [key: number]: Position } = {};

    const lines = rawSource.split("\n");

    for (let [lineIdx, line] of lines.entries()) {
        for (let i = 1; i <= MAX_POSITION_LITERALS; ++i) {
            const character = String.fromCharCode(i);
            const column = line.indexOf(character);
            if (column !== -1) {
                line = line.replace(character, "");
                positions[i] = { line: lineIdx + 1, column: column + 1 };
            }
        }

        lines[lineIdx] = line;
    }

    const locations = {
        between(startIdx: number, stopIdx: number): SourceLocation {
            return {
                start: positions[startIdx],
                stop: positions[stopIdx]
            }
        }
    };

    return { locations, ...parseImpl(lines.join("\n")) };
}

describe("Parser", () => {
    describe("Statement separation", () => {
        it("should split on newline", () => {
            const { nodes, errors, locations } = parse(`
                \x01{foo} = ON\x02
                \x03{bar} = OFF\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(2);

            expect(nodes[0].location).toStrictEqual(locations.between(1, 2));
            expect(nodes[1].location).toStrictEqual(locations.between(3, 4));
        });

        it("should split on newlines", () => {
            const { nodes, errors, locations } = parse(`
                \x01{foo} = ON\x02


                \x03{bar} = OFF\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(2);

            expect(nodes[0].location).toStrictEqual(locations.between(1, 2));
            expect(nodes[1].location).toStrictEqual(locations.between(3, 4));
        });

        it("should split on semicolon", () => {
            const { nodes, errors, locations } = parse(`
                \x01{foo} = ON\x02;\x03{bar} = OFF\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(2);

            expect(nodes[0].location).toStrictEqual(locations.between(1, 2));
            expect(nodes[1].location).toStrictEqual(locations.between(3, 4));
        });
    });

    describe("Comments", () => {
        it("should ignore lines starting with '#'", () => {
            const { nodes, errors, locations } = parse(`
                # {baz} = 123
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(0);
        });

        it("should ignore anything after '#'", () => {
            const { nodes, errors, locations } = parse(`
                {foo} = bar; # {baz} = 123
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);
        });
    });

    describe("Settings", () => {
        describe("String value", () => {
            it("should parse an unqoted literal", () => {
                const { nodes, errors, locations } = parse(`
                    {\x01foo\x02} = \x03bar\x04
                `);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0].type).toBe("SettingAssignment");
                if (nodes[0].type === "SettingAssignment") {
                    expect(nodes[0].setting.name!.valueOf()).toBe("foo");
                    expect(nodes[0].setting.name!.location).toStrictEqual(locations.between(1, 2));

                    expect(nodes[0].value.valueOf()).toBe("bar");
                    expect(nodes[0].value.location).toStrictEqual(locations.between(3, 4));
                }
            });
        });

        describe("Numeric value", () => {
            it("should parse a positive integer value", () => {
                const { nodes, errors, locations } = parse(`
                    {\x01foo\x02} = \x03123\x04
                `);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0].type).toBe("SettingAssignment");
                if (nodes[0].type === "SettingAssignment") {
                    expect(nodes[0].setting.name!.valueOf()).toBe("foo");
                    expect(nodes[0].setting.name!.location).toStrictEqual(locations.between(1, 2));

                    expect(nodes[0].value.valueOf()).toBe(123);
                    expect(nodes[0].value.location).toStrictEqual(locations.between(3, 4));
                }
            });

            it("should parse a negative integer value", () => {
                const { nodes, errors, locations } = parse(`
                    {\x01foo\x02} = \x03-1\x04
                `);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0].type).toBe("SettingAssignment");
                if (nodes[0].type === "SettingAssignment") {
                    expect(nodes[0].setting.name!.valueOf()).toBe("foo");
                    expect(nodes[0].setting.name!.location).toStrictEqual(locations.between(1, 2));

                    expect(nodes[0].value.valueOf()).toBe(-1);
                    expect(nodes[0].value.location).toStrictEqual(locations.between(3, 4));
                }
            });

            it("should parse a positive float value", () => {
                const { nodes, errors, locations } = parse(`
                    {\x01foo\x02} = \x031.23\x04
                `);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0].type).toBe("SettingAssignment");
                if (nodes[0].type === "SettingAssignment") {
                    expect(nodes[0].setting.name!.valueOf()).toBe("foo");
                    expect(nodes[0].setting.name!.location).toStrictEqual(locations.between(1, 2));

                    expect(nodes[0].value.valueOf()).toBe(1.23);
                    expect(nodes[0].value.location).toStrictEqual(locations.between(3, 4));
                }
            });

            it("should parse a negative float value", () => {
                const { nodes, errors, locations } = parse(`
                    {\x01foo\x02} = \x03-1.23\x04
                `);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0].type).toBe("SettingAssignment");
                if (nodes[0].type === "SettingAssignment") {
                    expect(nodes[0].setting.name!.valueOf()).toBe("foo");
                    expect(nodes[0].setting.name!.location).toStrictEqual(locations.between(1, 2));

                    expect(nodes[0].value.valueOf()).toBe(-1.23);
                    expect(nodes[0].value.location).toStrictEqual(locations.between(3, 4));
                }
            });
        });

        describe("Boolean value", () => {
            it("should parse a truthy value", () => {
                const { nodes, errors, locations } = parse(`
                    {\x01foo\x02} = \x03ON\x04
                `);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0].type).toBe("SettingAssignment");
                if (nodes[0].type === "SettingAssignment") {
                    expect(nodes[0].setting.name!.valueOf()).toBe("foo");
                    expect(nodes[0].setting.name!.location).toStrictEqual(locations.between(1, 2));

                    expect(nodes[0].value.valueOf()).toBe(true);
                    expect(nodes[0].value.location).toStrictEqual(locations.between(3, 4));
                }
            });

            it("should parse a falsy value", () => {
                const { nodes, errors, locations } = parse(`
                    {\x01foo\x02} = \x03OFF\x04
                `);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0].type).toBe("SettingAssignment");
                if (nodes[0].type === "SettingAssignment") {
                    expect(nodes[0].setting.name!.valueOf()).toBe("foo");
                    expect(nodes[0].setting.name!.location).toStrictEqual(locations.between(1, 2));

                    expect(nodes[0].value.valueOf()).toBe(false);
                    expect(nodes[0].value.location).toStrictEqual(locations.between(3, 4));
                }
            });
        });

        describe("Compound setting names", () => {
            it("should parse prefix + suffix", () => {
                const { nodes, errors, locations } = parse(`
                    {\x01foo\x02:\x03bar\x04} = \x05baz\x06
                `);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0].type).toBe("SettingAssignment");
                if (nodes[0].type === "SettingAssignment") {
                    expect(nodes[0].setting.expression!.name.valueOf()).toBe("foo");
                    expect(nodes[0].setting.expression!.name.location).toStrictEqual(locations.between(1, 2));

                    expect(nodes[0].setting.expression!.argument.valueOf()).toBe("bar");
                    expect(nodes[0].setting.expression!.argument.location).toStrictEqual(locations.between(3, 4));

                    expect(nodes[0].value.valueOf()).toBe("baz");
                    expect(nodes[0].value.location).toStrictEqual(locations.between(5, 6));
                }
            });
        });
    });

    describe("Triggers", () => {
        it("should parse inline triggers", () => {
            const { nodes, errors, locations } = parse(`
                {\x01aaa\x02:\x03bbb\x04} when {\x05ccc\x06:\x07ddd\x08}
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0].type).toBe("Trigger");
            if (nodes[0].type === "Trigger") {
                expect(nodes[0].action.name.valueOf()).toBe("aaa");
                expect(nodes[0].action.name.location).toStrictEqual(locations.between(1, 2));

                expect(nodes[0].action.argument.valueOf()).toBe("bbb");
                expect(nodes[0].action.argument.location).toStrictEqual(locations.between(3, 4));

                expect(nodes[0].condition.name.valueOf()).toBe("ccc");
                expect(nodes[0].condition.name.location).toStrictEqual(locations.between(5, 6));

                expect(nodes[0].condition.argument.valueOf()).toBe("ddd");
                expect(nodes[0].condition.argument.location).toStrictEqual(locations.between(7, 8));
            }
        });

        it("should parse block triggers", () => {
            const { nodes, errors, locations } = parse(`
                when {\x01aaa\x02:\x03bbb\x04} do
                    {\x05ccc\x06:\x07ddd\x08}
                    {\x09eee\x0B:\x0Cfff\x0D}
                end
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0].type).toBe("TriggerChain");
            if (nodes[0].type === "TriggerChain") {
                expect(nodes[0].condition.name.valueOf()).toBe("aaa");
                expect(nodes[0].condition.name.location).toStrictEqual(locations.between(1, 2));

                expect(nodes[0].condition.argument.valueOf()).toBe("bbb");
                expect(nodes[0].condition.argument.location).toStrictEqual(locations.between(3, 4));

                expect(nodes[0].actions.length).toBe(2);

                expect(nodes[0].actions[0].name.valueOf()).toBe("ccc")
                expect(nodes[0].actions[0].name.location).toStrictEqual(locations.between(5, 6));
                expect(nodes[0].actions[0].argument.valueOf()).toBe("ddd");
                expect(nodes[0].actions[0].argument.location).toStrictEqual(locations.between(7, 8));

                expect(nodes[0].actions[1].name.valueOf()).toBe("eee")
                expect(nodes[0].actions[1].name.location).toStrictEqual(locations.between(0x09, 0x0B));
                expect(nodes[0].actions[1].argument.valueOf()).toBe("fff");
                expect(nodes[0].actions[1].argument.location).toStrictEqual(locations.between(0x0C, 0x0D));
            }
        });
    });
});
