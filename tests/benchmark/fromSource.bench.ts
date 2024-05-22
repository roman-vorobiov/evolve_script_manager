import exampleConfig from "$lib/assets/example.txt?raw";

import { describe, bench } from "vitest";

import { fromSource } from "$lib/core/dsl";

describe("Compilation", () => {
    bench("fromSource", () => {
        fromSource(exampleConfig);
    });
});
