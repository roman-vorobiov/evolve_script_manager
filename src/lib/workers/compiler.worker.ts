import { fromSource } from "$lib/core/dsl";

type Request = {
    model: Record<string, string>,
    target: string
}

onmessage = ({ data }: MessageEvent<Request>) => {
    postMessage(fromSource(data.model, data.target));
};

export {};
