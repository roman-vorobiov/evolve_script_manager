import { type State, initialState } from "$lib/core/state";
import * as Storage from "./storage";

const currentVersion = 1;

type Versioned = { version: Number, state: any };

function serialize(state: State): Versioned {
    return { version: currentVersion, state };
}

function deserialize({ version, state }: Versioned): State {
    if (version === 1) {
        return state as State;
    }
    else {
        console.error("Local storage corrupted. Using the default state.");
        return initialState;
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
        return initialState;
    }

    return deserialize(JSON.parse(raw) as Versioned);
}
