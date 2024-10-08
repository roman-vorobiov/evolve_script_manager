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
    let finished = false;

    const forbiddenCharacters = {
        ['"']: "double quote",
        ['\n']: "newline"
    };

    $: {
        if (formValue.length === 0) {
            errorMessage = "File name must not be empty";
        }
        else if (Object.keys(forbiddenCharacters).some(c => formValue.includes(c))) {
            errorMessage = "The following characters are not allowed in file names: " + Object.values(forbiddenCharacters).join(", ");
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
                if (!state.renameConfig(config.name, formValue)) {
                    config.name = formValue;
                }
                state = state;
                callback();
                finished = true;
            }
        }
    });
</script>

<Tooltip.Root open={errorMessage.length !== 0 && !pristine && !finished} openDelay={100_000_000}>
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

