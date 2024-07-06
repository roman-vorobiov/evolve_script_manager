import exampleConfig from "$lib/assets/example.txt?raw";

import { describe, bench } from "vitest";

import { fromSource } from "$lib/core/dsl";
import { parseSource } from "$lib/core/dsl/parser/parser";

import { inlineReferences }        from "$lib/core/dsl/compiler/inlineReferences";
import { resolveWildcards }        from "$lib/core/dsl/compiler/wildcards";
import { resolveFolds }            from "$lib/core/dsl/compiler/folds";
import { resolvePlaceholders }     from "$lib/core/dsl/compiler/placeholders";
import { resolvePrefixes }         from "$lib/core/dsl/compiler/prefixes";
import { resolveAliases }          from "$lib/core/dsl/compiler/aliases";
import { validateTypes }           from "$lib/core/dsl/compiler/validation";
import { applyConditionBlocks }    from "$lib/core/dsl/compiler/conditionBlocks";
import { collectLogFilterStrings } from "$lib/core/dsl/compiler/logFilter";
import { collectIgnoredTechs }     from "$lib/core/dsl/compiler/ignoredResearch";
import { buildEvolutionQueue }     from "$lib/core/dsl/compiler/evolutionQueue";
import { flattenExpressions }      from "$lib/core/dsl/compiler/conditions";
import { createTriggerChains }     from "$lib/core/dsl/compiler/triggers";
import { createTriggerConditions } from "$lib/core/dsl/compiler/triggerConditions";
import { normalizeStatements }     from "$lib/core/dsl/compiler/normalize";

const steps = [
    inlineReferences,
    resolveWildcards,
    resolveFolds,
    resolvePlaceholders,
    resolvePrefixes,
    resolveAliases,
    validateTypes,
    applyConditionBlocks,
    collectLogFilterStrings,
    collectIgnoredTechs,
    buildEvolutionQueue,
    flattenExpressions,
    createTriggerChains,
    createTriggerConditions,
    normalizeStatements,
];

const { nodes, sourceMap } = parseSource({ main: exampleConfig }, "main");

const statements: any[] = [nodes];
for (const step of steps) {
    statements.push(step(statements.at(-1), sourceMap, [], []));
}

describe("Steps", () => {
    bench("parse", () => {
        parseSource({ main: exampleConfig }, "main");
    });

    for (let i = 0; i != steps.length; ++i) {
        bench(steps[i].name, () => {
            steps[i](statements[i], sourceMap, [], [])
        });
    }
});

describe("Full", () => {
    bench("fromSource", () => {
        fromSource({ main: exampleConfig }, "main");
    });
});
