import settingPrefixes from "$lib/core/domain/prefixes";
import defaultSettings from "$lib/assets/default.json";
import { compileCondition } from "./expressions";
import { ParseError } from "../parser/model";
import { withLocation } from "../parser/utils";

import type { SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";
import type * as Compiler from "./model";
import { settingType } from "$lib/core/domain/settings";

function validateSettingPrefix(settingPrefix: SourceTracked<String>): string {
    const prefix = settingPrefixes[settingPrefix.valueOf()];

    if (prefix === undefined) {
        throw new ParseError(`Unknown setting prefix '${settingPrefix}'`, settingPrefix.location);
    }

    return prefix;
}

function validateSetting(settingName: SourceTracked<String>): string {
    if (defaultSettings[settingName.valueOf() as keyof typeof defaultSettings] === undefined) {
        throw new ParseError(`Unknown setting '${settingName}'`, settingName.location);
    }

    return settingName.valueOf();
}

function validateSettingValue(settingName: string, settingValue: SourceTracked<Parser.Constant>): string | number | boolean {
    const expectedType = settingType(settingName);
    const actualType = typeof settingValue.valueOf()

    if (expectedType !== actualType) {
        throw new ParseError(`Expected ${expectedType}, got ${actualType}`, settingValue.location);
    }

    return settingValue.valueOf();
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

export function *compileSettingAssignment(node: Parser.SettingAssignment): Generator<Compiler.SettingAssignment | Compiler.Override> {
    const settingName = normalizeSettingName(node.setting);
    const settingValue = validateSettingValue(settingName, node.value);

    if (node.condition !== undefined) {
        for (let condition of compileCondition(node.condition)) {
            yield {
                type: "Override",
                target: settingName,
                condition,
                value: settingValue
            };
        }
    }
    else {
        yield {
            type: "SettingAssignment",
            setting: settingName,
            value: settingValue
        };
    }
}
