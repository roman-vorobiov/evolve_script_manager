import { settingPrefixes } from "$lib/core/domain";
import defaultSettings from "$lib/assets/default.json";
import { withLocation } from "$lib/core/dsl/parser/utils";

import type * as Parser from "$lib/core/dsl/parser/model";
import type * as Compiler from "./model";

function validateSettingPrefix(settingPrefix: Parser.SourceTracked<String>): string {
    const prefix = settingPrefixes[settingPrefix.valueOf()];

    if (prefix === undefined) {
        throw { message: `Unknown setting prefix '${settingPrefix}'`, location: settingPrefix.location };
    }

    return prefix;
}

function validateSetting(settingName: Parser.SourceTracked<String>): string {
    if (defaultSettings[settingName.valueOf() as keyof typeof defaultSettings] === undefined) {
        throw { message: `Unknown setting '${settingName}'`, location: settingName.location };
    }

    return settingName.valueOf();
}

function normalizeCompoundSettingName(node: Parser.CallExpression): string {
    const prefix = validateSettingPrefix(node.name);
    return `${prefix}${node.argument.valueOf()}`;
}

function normalizeSettingName(node: Parser.Setting): string {
    if (node.name !== undefined) {
        return validateSetting(node.name);
    }
    else if (node.expression !== undefined) {
        const setting = normalizeCompoundSettingName(node.expression);
        return validateSetting(withLocation(node.expression.argument.location, setting));
    }
    else {
        throw new Error(`Unknown settingId format: ${node}`);
    }
}

export function *compileSettingAssignment(node: Parser.SettingAssignment): Generator<Compiler.SettingAssignment> {
    yield {
        type: "SettingAssignment",
        setting: normalizeSettingName(node.setting),
        value: node.value.valueOf()
    };
}
