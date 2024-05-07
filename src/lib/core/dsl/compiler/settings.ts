import { settingPrefixes } from "$lib/core/domain";
import defaultSettings from "$lib/assets/default.json";
import { withLocation } from "$lib/core/dsl/parser/utils";

import type { SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";
import type * as Compiler from "./model";

function validateSettingPrefix(settingPrefix: SourceTracked<String>): string {
    const prefix = settingPrefixes[settingPrefix.valueOf()];

    if (prefix === undefined) {
        throw { message: `Unknown setting prefix '${settingPrefix}'`, location: settingPrefix.location };
    }

    return prefix;
}

function validateSetting(settingName: SourceTracked<String>): string {
    if (defaultSettings[settingName.valueOf() as keyof typeof defaultSettings] === undefined) {
        throw { message: `Unknown setting '${settingName}'`, location: settingName.location };
    }

    return settingName.valueOf();
}

function normalizeCompoundSettingName(node: Parser.Identifier): string {
    const prefix = validateSettingPrefix(node.name);
    return `${prefix}${node.targets[0].valueOf()}`;
}

function normalizeSettingName(node: SourceTracked<Parser.Identifier>): string {
    if (node.targets.length !== 0) {
        const setting = normalizeCompoundSettingName(node);
        return validateSetting(withLocation(node.targets[0].location, setting));
    }
    else {
        return validateSetting(node.name);
    }
}

export function *compileSettingAssignment(node: Parser.SettingAssignment): Generator<Compiler.SettingAssignment> {
    yield {
        type: "SettingAssignment",
        setting: normalizeSettingName(node.setting),
        value: node.value.valueOf()
    };
}
