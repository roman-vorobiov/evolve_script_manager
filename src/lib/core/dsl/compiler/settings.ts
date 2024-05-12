import defaultSettings from "$lib/assets/default.json";
import settingPrefixes from "$lib/core/domain/prefixes";
import { settingType } from "$lib/core/domain/settings";
import { compileCondition } from "./expressions";
import { conjunction } from "./utils";
import { ParseError } from "../parser/model";
import { withLocation } from "../parser/utils";

import type { SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";
import type * as Compiler from "./model";

function validateSettingPrefix(settingPrefix: SourceTracked<String>): string {
    const prefix = settingPrefixes[settingPrefix.valueOf()]?.prefix;

    if (prefix === undefined) {
        throw new ParseError(`Unknown setting prefix '${settingPrefix}'`, settingPrefix.location);
    }

    return prefix;
}

function validateSettingSuffix(settingPrefix: string, settingSuffix: SourceTracked<String>): string {
    const info = settingPrefixes[settingPrefix];

    if (info.allowedValues.indexOf(settingSuffix.valueOf()) === -1) {
        throw new ParseError(`Unknown ${info.valueDescription} '${settingSuffix}'`, settingSuffix.location);
    }

    return settingSuffix.valueOf();
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

function resolveTarget(prefix: string, suffix: SourceTracked<String>): SourceTracked<String> {
    return withLocation(suffix.location, `${prefix}${suffix}`);
}

function unwrapTargets(node: SourceTracked<Parser.Identifier>): [SourceTracked<String>, SourceTracked<String>][] {
    if (node.targets.length !== 0) {
        const prefix = validateSettingPrefix(node.name);

        for (const suffix of node.targets) {
            validateSettingSuffix(node.name.valueOf(), suffix);
        }

        return node.targets.map(target => [target, resolveTarget(prefix, target)]);
    }
    else if (node.wildcard?.valueOf()) {
        const prefix = validateSettingPrefix(node.name);

        const info = settingPrefixes[node.name.valueOf()];
        return info.allowedValues
            .map(target => withLocation(node.wildcard!.location, target))
            .map(target => [target, resolveTarget(prefix, target)]);
    }
    else {
        if (node.placeholder?.valueOf()) {
            throw new ParseError("Placeholder used without the context to resolve it", node.placeholder.location);
        }

        return [[node.name, node.name]];
    }
}

export function* compileSettingAssignment(
    node: Parser.SettingAssignment,
    scopeCondition?: SourceTracked<Parser.Expression>
): Generator<Compiler.SettingAssignment | Compiler.Override> {
    for (const [arg, settingNameNode] of unwrapTargets(node.setting)) {
        const settingName = validateSetting(settingNameNode);
        const settingValue = validateSettingValue(settingName, node.value);

        const condition = conjunction(scopeCondition, node.condition);

        if (condition !== undefined) {
            const conditionLocation = node.condition?.location ?? scopeCondition!.location;
            const computedCondition = compileCondition(withLocation(conditionLocation, condition), arg);

            yield {
                type: "Override",
                target: settingName,
                condition: computedCondition,
                value: settingValue
            };
        }
        else {
            yield {
                type: "SettingAssignment",
                setting: settingName,
                value: settingValue
            };
        }
    }
}
