export function valuesOf(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(valuesOf);
    }
    else if (obj instanceof Object) {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([key]) => !key.startsWith("$"))
                .map(([key, value]) => [key, valuesOf(value)])
        );
    }
    else {
        return obj;
    }
}

export function decoratorsOf(obj: any): any {
    if (Array.isArray(obj)) {
        const childDecorators = obj.map(decoratorsOf);
        if (childDecorators.length !== 0) {
            return childDecorators;
        }
    }
    else if (obj instanceof Object) {
        return Object.fromEntries(
            Object.entries(obj)
                .map(([key, value]) => [key, key.startsWith("$") ? value : decoratorsOf(value)])
                .filter(([key, value]) => value !== undefined)
        );
    }
}
