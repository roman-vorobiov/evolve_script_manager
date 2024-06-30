export type Config = {
    name: string,
    source: string
}

type ConfigCallback = (cfg: Config) => void;
type OptionalConfigCallback = (cfg: Config | null) => void;

export class State {
    private onConfigAddedCallbacks: Record<number, ConfigCallback> = {};
    private onConfigRemovedCallbacks: Record<number, ConfigCallback> = {};
    private onActiveConfigChangedCallbacks: Record<number, OptionalConfigCallback> = {};

    constructor(
        public configs: Config[] = [],
        public activeConfig: string | null = null,
        public previewOpen: boolean = false,
        public browserOpen: boolean = false
    ) {}

    findConfig(configName: string) {
        return this.configs.find(cfg => cfg.name === configName);
    }

    addConfig(config: Config) {
        this.configs.push(config);
        this.activeConfig = config.name;

        this.invokeCallbacks(this.onConfigAddedCallbacks, config);
        this.invokeCallbacks(this.onActiveConfigChangedCallbacks, config);
    }

    removeConfig(config: Config) {
        const idx = this.configs.indexOf(config);
        if (idx !== -1) {
            if (this.activeConfig === config.name) {
                this.activeConfig = null;
                this.invokeCallbacks(this.onActiveConfigChangedCallbacks, null);
            }
            this.configs.splice(idx, 1);
            this.invokeCallbacks(this.onConfigRemovedCallbacks, config);
            return true;
        }
        else {
            return false;
        }
    }

    renameConfig(config: Config, newName: string) {
        if (config === undefined) {
            return;
        }

        if (config.name === this.activeConfig) {
            this.activeConfig = newName;
        }

        config.name = newName;
    }

    setActive(config: Config) {
        this.activeConfig = config.name;
        this.invokeCallbacks(this.onActiveConfigChangedCallbacks, config);

        return true;
    }

    onConfigAdded(callback: ConfigCallback) {
        return this.addCallback(this.onConfigAddedCallbacks, callback);
    }

    removeConfigAddedCallback(id: number) {
        this.removeCallback(this.onConfigAddedCallbacks, id);
    }

    onConfigRemoved(callback: ConfigCallback) {
        return this.addCallback(this.onConfigRemovedCallbacks, callback);
    }

    removeConfigRemovedCallback(id: number) {
        this.removeCallback(this.onConfigRemovedCallbacks, id);
    }

    onActiveConfigChanged(callback: OptionalConfigCallback) {
        return this.addCallback(this.onActiveConfigChangedCallbacks, callback);
    }

    removeActiveConfigChangedCallback(id: number) {
        this.removeCallback(this.onActiveConfigChangedCallbacks, id);
    }

    private addCallback<T>(callbacks: Record<number, T>, callback: T) {
        const id = Object.keys(callbacks).length;
        callbacks[id] = callback;
        return id;
    }

    private removeCallback<T>(callbacks: Record<number, T>, id: number) {
        delete callbacks[id];
    }

    private invokeCallbacks<T>(callbacks: Record<number, (cfg: T) => void>, config: T) {
        for (const callback of Object.values(callbacks)) {
            callback(config);
        }
    }
};
