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

/**
 * @brief Map full paths to values recursively
 *
 * @example { a: { b: { c: 123 } } } -> { ["a"]: { b: { c: 123 } }, ["a.b"]: { c: 123 }, ["a.b.c"]: 123 }
 */
export function flattenObject<T extends object>(obj: T, rootName: string = "root"): Record<string, any> {
    const uriToObjectMap: Record<string, any> = {};

    function fillObjectMap(obj: any, uri: string) {
        if (Array.isArray(obj)) {
            obj.forEach((item, idx) => fillObjectMap(item, uri + `[${idx}]`));
        }
        else if (obj instanceof Object) {
            Object.entries(obj).forEach(([key, value]) => fillObjectMap(value, uri + "." + key))
        }
        uriToObjectMap[uri] = obj;
    }

    fillObjectMap(obj, rootName);

    return uriToObjectMap;
}

/**
 * @brief Map values to keys
 *
 * @note Ignores non-object values
 */
export function invertMap<V extends WeakKey>(map: Record<string, V>): WeakMap<WeakKey, string> {
    const objectToUriMap = new WeakMap<WeakKey, string>();

    for (const [key, value] of Object.entries(map)) {
        if (value instanceof Object) {
            objectToUriMap.set(value, key);
        }
    }

    return objectToUriMap;
}
