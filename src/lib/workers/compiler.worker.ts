import { fromSource } from "$lib/core/dsl";

type Request = {
    source: string
}

onmessage = ({ data }: MessageEvent<Request>) => {
    postMessage(fromSource(data.source));
};

export {};
