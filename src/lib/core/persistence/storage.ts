function makeKey(key: string) {
    return `esm.${key}`;
}

export function get(key: string) {
    return localStorage.getItem(makeKey(key));
}

export function set(key: string, value: string) {
    localStorage.setItem(makeKey(key), value);
}
