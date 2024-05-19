import defaultSettings from "$lib/assets/default.json";
import { settingType, prefixes } from "$lib/core/domain/settings";
import { compileCondition, compileSettingValue } from "./expressions";
import { makeConditionalAssignmentNode } from "./normalize";
import { conjunction, isConstantExpression } from "./utils";
import { ParseError } from "../parser/model";
import { withLocation } from "../parser/utils";

import type { SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";
import type * as Compiler from "./model";
import { checkType, validateExpression } from "./validate";

function validateSettingPrefix(settingPrefix: SourceTracked<String>): string {
    const prefix = prefixes[settingPrefix.valueOf()]?.prefix;

    if (prefix === undefined) {
        throw new ParseError(`Unknown setting prefix '${settingPrefix}'`, settingPrefix.location);
    }

    return prefix;
}

function validateSettingSuffix(settingPrefix: string, settingSuffix: SourceTracked<String>): string {
    const info = prefixes[settingPrefix];

    if (info.allowedSuffixes.indexOf(settingSuffix.valueOf()) === -1) {
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

        const info = prefixes[node.name.valueOf()];
        return info.allowedSuffixes
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
    const condition = conjunction(scopeCondition, node.condition);
    const conditionLocation = node.condition?.location ?? scopeCondition?.location;
    const trackedCondition = condition && withLocation(conditionLocation!, condition);

    let expectedValueType: string;

    for (const [arg, settingNameNode] of unwrapTargets(node.setting)) {
        const settingName = validateSetting(settingNameNode);
        expectedValueType ??= settingType(settingName)!;

        if (isConstantExpression(node.value)) {
            checkType(typeof node.value.valueOf(), expectedValueType, node.value.location);

            if (trackedCondition !== undefined) {
                yield {
                    type: "Override",
                    target: settingName,
                    condition: compileCondition(trackedCondition, arg),
                    value: node.value.valueOf()
                };
            }
            else {
                yield {
                    type: "SettingAssignment",
                    setting: settingName,
                    value: node.value.valueOf()
                };
            }
        }
        else {
            const value = makeConditionalAssignmentNode(node.value, trackedCondition, arg);
            const valueType = validateExpression(value);
            checkType(valueType, expectedValueType, value.location);

            yield {
                type: "Override",
                target: settingName,
                condition: compileSettingValue(value),
                value: null
            };
        }
    }
}
