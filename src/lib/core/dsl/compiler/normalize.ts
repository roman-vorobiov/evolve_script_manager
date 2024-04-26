import { settingPrefixes } from "$lib/core/domain";
import defaultSettings from "$lib/assets/default.json";

import type * as Parser from "$lib/core/dsl/parser/model";
import type { Statement, SettingAssignment } from "./model";

function validateSettingPrefix(settingPrefix: string, location: Parser.SourceLocation): string {
    const prefix = settingPrefixes[settingPrefix];

    if (prefix === undefined) {
        throw { message: `Unknown setting prefix '${settingPrefix}'`, ...location };
    }

    return prefix;
}

function validateSetting(settingName: string, location: Parser.SourceLocation): string {
    if (defaultSettings[settingName as keyof typeof defaultSettings] === undefined) {
        throw { message: `Unknown setting '${settingName}'`, ...location };
    }

    return settingName;
}

function normalizeCompoundSettingName(node: Parser.CallExpression): string {
    const prefix = validateSettingPrefix(node.name.valueOf(), node.name.location);
    return `${prefix}${node.argument.valueOf()}`;
}

function normalizeSettingName(node: Parser.Setting): string {
    if (node.name !== undefined) {
        return validateSetting(node.name.valueOf(), node.name.location);
    }
    else if (node.expression !== undefined) {
        const setting = normalizeCompoundSettingName(node.expression);
        return validateSetting(setting, node.expression.argument.location);
    }
    else {
        throw new Error(`Unknown settingId format: ${node}`);
    }
}

function normalizeSettingAssignment(node: Parser.Node): SettingAssignment {
    return {
        type: "SettingAssignment",
        setting: normalizeSettingName(node.setting),
        value: node.value.valueOf()
    };
}

function *normalizeImpl(nodes: Parser.Node[], errors: Parser.ParseError[]): Generator<Statement> {
    for (let node of nodes) {
        try {
            if (node.type === "SettingAssignment") {
                yield normalizeSettingAssignment(node);
            }
        }
        catch (e) {
            if (e instanceof Error) {
                throw e;
            }

            errors.push(e as Parser.ParseError);
        }
    }
}

export function normalize(nodes: Parser.Node[], errors: Parser.ParseError[]): Statement[] {
    return [...normalizeImpl(nodes, errors)];
}
