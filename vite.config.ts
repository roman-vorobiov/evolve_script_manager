import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import { execSync } from "child_process";

export default defineConfig({
    plugins: [
        sveltekit(),
        {
            name: "Parser auto-generation",
            async handleHotUpdate(ctx) {
                if (ctx.file.endsWith(".g4")) {
                    const grammarRoot = ctx.file.slice(0, ctx.file.lastIndexOf("/"));
                    const getModule = (filename: string) => {
                        return ctx.server.moduleGraph.getModuleById(`${grammarRoot}/.antlr/${filename}`)!;
                    };

                    // Wait untill all files are generated and then trigger HMR for all of them at once
                    execSync("npm run generate");

                    return [
                        getModule("DSLLexer.ts"),
                        getModule("DSLParser.ts"),
                        getModule("DSLVisitor.ts"),
                    ];
                }
            }
        }
    ],
    server: {
        watch: {
            // Don't watch auto-generated files - instead, trigger HMR for them manually, as a single update
            // Otherwise each generated fille would trigger the update resulting in excessive module reloads
            ignored: ["**/.antlr/*"]
        }
    },
    test: {
        include: ["tests/unit2/**/*.{test,spec}.{js,ts}"]
    }
});
