import exampleConfig from "$lib/assets/example.txt?raw";

import { describe, bench } from "vitest";

import { fromSource } from "$lib/core/dsl2";

describe("Compilation", () => {
    bench("fromSource", () => {
        fromSource(exampleConfig);
    });
});
