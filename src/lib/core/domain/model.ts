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
    triggers: Trigger[],
    [key: string]: any
}
