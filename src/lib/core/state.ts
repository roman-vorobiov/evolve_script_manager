export type Config = {
    name: string,
    source: string
}

export type State = {
    configs: Config[],
    activeConfig: string | null,
    previewOpen: boolean,
    browserOpen: boolean
};

export const initialState: State = {
    configs: [],
    activeConfig: null,
    previewOpen: false,
    browserOpen: false
};
