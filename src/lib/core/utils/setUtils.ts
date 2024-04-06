import { concatenate } from "$lib/core/utils/rangeUtils";

function compare(l: any, r: any) {
    if (typeof l !== typeof r) {
        return false;
    }
    else if (l instanceof Object) {
        return JSON.stringify(l) === JSON.stringify(r);
    }
    else {
        return l === r;
    }
}

function compareValues(key: any, l: Object, r: Object) {
    return key in r && compare(r[key as keyof typeof r], l[key as keyof typeof l]);
}

function lDifferenceImpl(l: Object, r: Object) {
    return Object.entries(l).filter(([key, value]) => !compareValues(key, l, r));
}

/**
 * @brief Shallow difference between two objects: l - r
 */
export function lDifference(l: Object, r: Object) {
    return Object.fromEntries(lDifferenceImpl(l, r));
}

/**
 * @brief Shallow difference between two objects: (l - r) | (r - l)
 */
export function difference(l: Object, r: Object) {
    return Object.fromEntries(concatenate(lDifferenceImpl(l, r), lDifferenceImpl(r, l)));
}
