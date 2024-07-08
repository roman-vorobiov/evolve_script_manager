import { State } from "$lib/core/state";
import { assert } from "$lib/core/utils/typeUtils";
import * as Storage from "./storage";

const currentVersion = 2;

type Versioned = { version: Number, state: any };

function serialize(state: State): Versioned {
    return { version: currentVersion, state };
}

function deserialize({ version, state }: Versioned): State | undefined {
    if (state === undefined) {
        return;
    }

    if (version === 1) {
        return new State([{ name: "My config", source: state.config }], "My config");
    }
    else if (version === 2) {
        assert<State>(state);
        return new State(state.configs, state.activeConfig, state.previewOpen, state.browserOpen);
    }
}

/**
 * @brief Save the state to local storage
 */
export function saveState(state: State) {
    Storage.set("state", JSON.stringify(serialize(state)));
}

/**
 * @brief Load the state from local storage
 *
 * @returns The stored state or the default one in case it failed to load one
 */
export function loadState(): State {
    const raw = Storage.get("state");

    if (raw === null) {
        return new State();
    }

    const state = deserialize(JSON.parse(raw) as Versioned);
    if (state !== undefined) {
        return state;
    }
    else {
        const backupKey = "state.backup";
        Storage.set(backupKey, raw);

        console.error("Unable to retrieve the state from localStorage");
        console.info(`The previous storage contents have been saved into localStorage with the '${backupKey}' key`);

        return new State();
    }
}
