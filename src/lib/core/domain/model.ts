type Value = string | number | boolean;

export type Override = {
    type1: string,
    arg1: Value,
    cmp: string,
    type2: string,
    arg2: Value,
    ret: Value
}

export type Trigger = {
    seq: number,
    priority: number,
    requirementType: string,
    requirementId: string,
    requirementCount: number,
    actionType: string,
    actionId: string,
    actionCount: number,
    complete: boolean
}

export type Config = {
    overrides: { [target: string]: Override[] },
    triggers: Trigger[],
    [key: string]: any
}
