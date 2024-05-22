import type * as Domain from "$lib/core/domain/model";

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: string,
    value: Domain.Value
}

export type Override = {
    type: "Override",
    value: Domain.Override
}

export type Trigger = {
    type: "Trigger",
    value: Domain.Trigger
}

export type Statement = SettingAssignment | Override | Trigger;
