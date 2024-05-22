import exampleConfig from "$lib/assets/example.txt?raw";

import { describe, bench } from "vitest";

import { fromSource as fromSourceOld } from "$lib/core/dsl";
import { fromSource } from "$lib/core/dsl2";

describe("Compilation", () => {
    bench("old", () => {
        fromSourceOld(exampleConfig);
    });

    bench("new", () => {
        fromSource(exampleConfig);
    });
});
