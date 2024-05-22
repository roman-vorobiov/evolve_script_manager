export type * as Initial from "./1";
export type * as Final from "./10";

export class ParseError extends Error {
    offendingEntity: any;

    constructor(message: string, offendingEntity: any) {
        super(message);
        this.offendingEntity = offendingEntity;
    }
}
