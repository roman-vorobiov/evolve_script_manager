<script lang="ts">
    import { createForm } from 'felte';

    import * as Tooltip from "$lib/components/ui/tooltip";

    import type { State, Config } from "./core/state";

    export let state: State;
    export let config: Config;
    export let callback: () => void;

    let formValue = config.name;
    let errorMessage: string = "";
    let pristine = true;

    $: {
        if (formValue.length === 0) {
            errorMessage = "Must not be empty";
        }
        else if (state.configs.filter(cfg => cfg !== config).some(cfg => cfg.name === formValue)) {
            errorMessage = "A config with this name already exists";
        }
        else {
            errorMessage = "";
        }
    }

    function grabFocus(element: HTMLElement) {
        // Some UI animations steal focus
        setTimeout(() => element.focus(), 1);
    }

    const { form } = createForm({
        onSubmit: () => {
            pristine = false;
            if (errorMessage.length === 0) {
                if (config.name === state.activeConfig) {
                    state.activeConfig = formValue;
                }
                config.name = formValue;
                callback();
            }
        }
    });
</script>

<Tooltip.Root open={errorMessage.length !== 0 && !pristine} openDelay={100_000_000}>
    <Tooltip.Trigger class="w-full">
        <form use:form class="w-full">
            <input
                use:grabFocus
                on:input={() => pristine = false}
                on:focusout
                name="configName"
                type="text"
                bind:value={formValue}
                class="w-full h-6 p-0 border-2 rounded-none bg-transparent"
                autocomplete="off"
            />
        </form>
    </Tooltip.Trigger>
    <Tooltip.Content class="bg-destructive text-destructive-foreground" side="bottom">
        {errorMessage}
    </Tooltip.Content>
</Tooltip.Root>

