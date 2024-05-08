import { withLocation } from "../parser/utils";

import type { SourceTracked } from "../parser/source";
import type { Expression } from "../parser/model";

export function conjunction(l: undefined, r: undefined): undefined;
export function conjunction(l: SourceTracked<Expression>, r: SourceTracked<Expression> | undefined): SourceTracked<Expression>;
export function conjunction(l: SourceTracked<Expression> | undefined, r: SourceTracked<Expression>): SourceTracked<Expression>;
export function conjunction(l: SourceTracked<Expression> | undefined, r: SourceTracked<Expression> | undefined): SourceTracked<Expression> | undefined;
export function conjunction(l: SourceTracked<Expression> | undefined, r: SourceTracked<Expression> | undefined): SourceTracked<Expression> | undefined {
    if (l === undefined) {
        return r;
    }

    if (r === undefined) {
        return l;
    }

    return withLocation(r.location, {
        operator: withLocation(r.location, "and"),
        args: [l, r]
    });
}
