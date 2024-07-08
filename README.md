## What is it?

A tool to help you manage your configs for Vollch's automation script for [Evolve](https://github.com/pmotschmann/Evolve).

## How does it work?

You need to add config files to the workspace - you can do this by uploading an existing JSON config (that you've exported from the game) or by creating a new one from scratch using the custom language.
Then you can browse all the configs in the workspace, preview the changes compared to the default settings, download, copy to clipboard or, if you have the helper userscript enabled, upload the selected config directly to the game tab with a single button.

## Custom language

If you prefer text-based configuration to UI, you can either edit the JSON by hand or use the custom language that was designed specifically to help describe the the script's behavior. It is compiled into the familiar JSON format that the Vollch's script uses, which you can see in the preview panel. You can work with either format but the DSL provides additional features that you can't get with UI:

- condition composition: the number of operands in override conditions are not limited to 2, which means you can pretty much forget about evals
- bulk editing: you can enable/disable `autoBuild` for all buildings with just 1 line instead of clicking each of the 100+ toggles manually
- conditional triggers (potentially, any other functionality that is enabled by hacky evals - the compiler can generate that for you)
- config composition: you can import other files (even under a condition!) so you can separate your MAD and ascension configs into different files
- the power of text editing: instead of dragging a trigger for 2 minutes to the top, you can just `Ctrl+X` + `Ctrl+V`

Check the [language guide](src/lib/core/dsl/README.md) for more info.

## Editor panel

This project uses the [Monaco editor](https://microsoft.github.io/monaco-editor/) - thus, if you're familiar with VS Code, you should feel right at home.
Basic syntax highlighting and autocomplete (triggered by `Ctrl+Space`) are implemented for the custom language.

## Browse panel

The browse panel (toggled using the button witht the files icon) shows all the configs you've added to the workspace. You can right-click on an empty space there to create or import a new config or on any of the existing ones to rename or delete it.
This is a flat list of files that is sorted alphabetically. While this means you can't create folders, file names can include special symbols to help you organize your configs.

## Preview panel

The preview panel (toggled using the button with the eye icon) shows the difference between default settings and the currently selected config.
