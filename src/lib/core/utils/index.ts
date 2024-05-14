export * from "./rangeUtils";
export * from "./setUtils";

/**
 * @brief Turn a POD into the corresponding object type
 */
export function toObject(value: any) {
    if (typeof value === "string") {
        return new String(value);
    }
    else if (typeof value === "number") {
        return new Number(value);
    }
    else if (typeof value === "boolean") {
        return new Boolean(value);
    }
    else if (typeof value === "object") {
        return value as any;
    }
    else {
        throw new Error(`Unknown value: ${value}`);
    }
}
