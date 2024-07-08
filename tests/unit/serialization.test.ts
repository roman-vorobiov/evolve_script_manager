import { describe, it, expect, beforeEach } from "vitest";
import { loadState } from "$lib/core/persistence/serialization";

class MockStorage implements Storage {
    public data: Record<string, string> = {};

    getItem(key: string): string | null {
        return this.data[key] ?? null;
    }

    setItem(key: string, value: string): void {
        this.data[key] = value;
    }

    removeItem(key: string): void {
        delete this.data[key];
    }

    clear(): void {
        this.data = {};
    }

    key(index: number): string | null {
        return Object.keys(this.data).at(index) ?? null;
    }

    get length(): number {
        return Object.entries(this.data).length;
    }
}

describe("Serialization", () => {
    beforeEach(() => {
        globalThis.localStorage = new MockStorage();
    });

    it("should use the default state if the storage is empty", () => {
        const state = loadState();

        expect(state.configs).toEqual([]);
        expect(state.activeConfig).toBeNull();
        expect(state.previewOpen).toEqual(false);
        expect(state.browserOpen).toEqual(false);
    });

    it("should use the default state if the storage is corrupted", () => {
        const previousState = {
            state: {
                config: "hello"
            }
        };

        localStorage.setItem("esm.state", JSON.stringify(previousState));

        const state = loadState();

        expect(state.configs).toEqual([]);
        expect(state.activeConfig).toBeNull();
        expect(state.previewOpen).toEqual(false);
        expect(state.browserOpen).toEqual(false);

        const backup = localStorage.getItem("esm.state.backup");
        expect(backup).not.toBeNull();
        expect(JSON.parse(backup!)).toEqual(previousState);
    });

    it("should correctly load version 1", () => {
        localStorage.setItem("esm.state", JSON.stringify({
            version: 1,
            state: {
                config: "hello"
            }
        }));

        const state = loadState();

        expect(state.configs).toEqual([
            {
                name: "My config",
                source: "hello"
            }
        ]);
        expect(state.activeConfig).toEqual("My config");
        expect(state.previewOpen).toEqual(false);
        expect(state.browserOpen).toEqual(false);
    });

    it("should correctly load version 2", () => {
        localStorage.setItem("esm.state", JSON.stringify({
            version: 2,
            state: {
                configs: [
                    {
                        name: "foo",
                        source: "hello"
                    },
                    {
                        name: "bar",
                        source: "bye"
                    }
                ],
                activeConfig: "bar",
                previewOpen: false,
                browserOpen: true
            }
        }));

        const state = loadState();

        expect(state.configs).toEqual([
            {
                name: "foo",
                source: "hello"
            },
            {
                name: "bar",
                source: "bye"
            }
        ]);
        expect(state.activeConfig).toEqual("bar");
        expect(state.previewOpen).toEqual(false);
        expect(state.browserOpen).toEqual(true);
    });
});
