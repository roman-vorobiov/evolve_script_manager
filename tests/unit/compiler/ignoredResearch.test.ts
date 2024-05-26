import { describe, it, expect } from "vitest";
import { processStatements } from "./fixture";
import { collectIgnoredTechs as collectIgnoredTechsImpl } from "$lib/core/dsl/compiler/ignoredResearch";

import type * as Parser from "$lib/core/dsl/model/7";

const collectIgnoredTechs = (nodes: Parser.Statement[]) => processStatements(nodes, collectIgnoredTechsImpl);

describe("Compiler", () => {
    describe("Ignored research", () => {
        it("should ignore other settings", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                values: [
                    { type: "String", value: "foo" }
                ]
            };

            const { nodes } = collectIgnoredTechs([originalNode]);
            expect(nodes.length).toEqual(1);

            expect(nodes[0]).toBe(originalNode);
        });

        it("should collect all unconditional pushes", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ]
            };

            const originalNode2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-republic" }
                ]
            };

            const { nodes } = collectIgnoredTechs([originalNode1, originalNode2]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingAssignment = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "researchIgnore" },
                value: { type: "String", value: "tech-theocracy,tech-republic" }
            };

            expect(nodes[0]).toEqual(expectedNode);
        });

        it("should process all values", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-theocracy" },
                    { type: "Identifier", value: "tech-republic" }
                ]
            };

            const { nodes } = collectIgnoredTechs([originalNode]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingAssignment = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "researchIgnore" },
                value: { type: "String", value: "tech-theocracy,tech-republic" }
            };

            expect(nodes[0]).toEqual(expectedNode);
        });

        it("should not push the same tech multiple times", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ]
            };

            const originalNode2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ]
            };

            const { nodes } = collectIgnoredTechs([originalNode1, originalNode2]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingAssignment = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "researchIgnore" },
                value: { type: "String", value: "tech-theocracy" }
            };

            expect(nodes[0]).toEqual(expectedNode);
        });

        it("should forward all conditional pushes", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Coal" }
                }
            };

            const originalNode2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-republic" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Coal" }
                }
            };

            const { nodes } = collectIgnoredTechs([originalNode1, originalNode2]);
            expect(nodes.length).toEqual(2);

            {
                const expectedNode: Parser.SettingAssignment = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "researchIgnore" },
                    value: { type: "String", value: "tech-theocracy" },
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: { type: "Identifier", value: "Coal" }
                    }
                };

                expect(nodes[0]).toEqual(expectedNode);
            }
            {
                const expectedNode: Parser.SettingAssignment = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "researchIgnore" },
                    value: { type: "String", value: "tech-republic" },
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: { type: "Identifier", value: "Coal" }
                    }
                };

                expect(nodes[1]).toEqual(expectedNode);
            }
        });

        it("should combine all conditions for the same pushed tech", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Coal" }
                }
            };

            const originalNode2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Stone" }
                }
            };

            const originalNode3: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-republic" }
                ]
            };

            const originalNode4: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-republic" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Stone" }
                }
            };

            const { nodes } = collectIgnoredTechs([originalNode1, originalNode2, originalNode3, originalNode4]);
            expect(nodes.length).toEqual(2);

            {
                const expectedNode: Parser.SettingAssignment = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "researchIgnore" },
                    value: { type: "String", value: "tech-theocracy" },
                    condition: {
                        type: "Expression",
                        operator: "or",
                        args: [
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceDemanded" },
                                key: { type: "Identifier", value: "Coal" }
                            },
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceDemanded" },
                                key: { type: "Identifier", value: "Stone" }
                            }
                        ]
                    }
                };

                expect(nodes[0]).toEqual(expectedNode);
            }
            {
                const expectedNode: Parser.SettingAssignment = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "researchIgnore" },
                    value: { type: "String", value: "tech-republic" }
                };

                expect(nodes[1]).toEqual(expectedNode);
            }
        });

        it("should combine all conditions for the same popped tech", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-republic" }
                ]
            };

            const originalNode2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: ">>",
                values: [
                    { type: "Identifier", value: "tech-republic" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Coal" }
                }
            };

            const originalNode3: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: ">>",
                values: [
                    { type: "Identifier", value: "tech-republic" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Stone" }
                }
            };

            const { nodes } = collectIgnoredTechs([originalNode1, originalNode2, originalNode3]);
            expect(nodes.length).toEqual(2);

            {
                const expectedNode: Parser.SettingAssignment = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "researchIgnore" },
                    value: { type: "String", value: "tech-republic" },
                    condition: {
                        type: "Expression",
                        operator: "or",
                        args: [
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceDemanded" },
                                key: { type: "Identifier", value: "Coal" }
                            },
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceDemanded" },
                                key: { type: "Identifier", value: "Stone" }
                            }
                        ]
                    }
                };

                expect(nodes[0]).toEqual(expectedNode);
            }
            {
                const expectedNode: Parser.SettingAssignment = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "researchIgnore" },
                    value: { type: "String", value: "tech-republic" }
                };

                expect(nodes[1]).toEqual(expectedNode);
            }
        });

        it("should pop techs that have been pushed unconditionally", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ]
            };

            const originalNode2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-republic" }
                ]
            };

            const originalNode3: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: ">>",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ]
            };

            const { nodes } = collectIgnoredTechs([originalNode1, originalNode2, originalNode3]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingAssignment = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "researchIgnore" },
                value: { type: "String", value: "tech-republic" }
            };

            expect(nodes[0]).toEqual(expectedNode);
        });

        it("should pop techs that have been pushed conditionally", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Stone" }
                }
            };

            const originalNode2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: ">>",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ]
            };

            const { nodes } = collectIgnoredTechs([originalNode1, originalNode2]);
            expect(nodes.length).toEqual(0);
        });

        it("should ignore unconditional pops for techs that have not been added previously", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: ">>",
                values: [
                    { type: "Identifier", value: "tech-republic" }
                ]
            };

            const { nodes } = collectIgnoredTechs([originalNode1]);
            expect(nodes.length).toEqual(0);
        });

        it("should ignore conditional pops for techs that have not been added previously", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: ">>",
                values: [
                    { type: "Identifier", value: "tech-republic" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Stone" }
                }
            };

            const { nodes } = collectIgnoredTechs([originalNode1]);
            expect(nodes.length).toEqual(0);
        });

        it("should order pushes before pops", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: ">>",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const originalNode2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "tech-theocracy" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Stone" }
                }
            };

            const { nodes } = collectIgnoredTechs([originalNode1, originalNode2]);
            expect(nodes.length).toEqual(2);

            {
                const expectedNode: Parser.SettingAssignment = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "researchIgnore" },
                    value: { type: "String", value: "tech-theocracy" },
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: { type: "Identifier", value: "Stone" }
                    }
                };

                expect(nodes[0]).toEqual(expectedNode);
            }
            {
                const expectedNode: Parser.SettingAssignment = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "researchIgnore" },
                    value: { type: "String", value: "tech-theocracy" },
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: { type: "Identifier", value: "Copper" }
                    }
                };

                expect(nodes[1]).toEqual(expectedNode);
            }
        });

        it("should throw on non-identifier values", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "String", value: "tech-theocracy" }
                ]
            };

            const { errors } = collectIgnoredTechs([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Identifier expected");
            expect(errors[0].offendingEntity).toBe(originalNode.values[0]);
        });

        it("should throw on invalid values", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "hello" }
                ]
            };

            const { errors } = collectIgnoredTechs([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Unknown research 'hello'");
            expect(errors[0].offendingEntity).toBe(originalNode.values[0]);
        });
    });
});
