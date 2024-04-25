import type { Statement } from "$lib/core/dsl/model";

function fillConfig(config: any, statement: Statement) {
    if (statement.type === "SettingAssignment") {
        config[statement.setting] = statement.value;
    }
}

export function compile(statements: Statement[]) {
    let config = {};

    for (let statement of statements) {
        fillConfig(config, statement);
    }

    return config;
}
