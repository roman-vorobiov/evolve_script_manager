import { sveltekit } from "@sveltejs/kit/vite";
import { run } from "vite-plugin-run";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [
        sveltekit(),
        run([
            {
                name: "Generate parser",
                run: ["npm", "run", "generate"],
                pattern: "**/*.g4"
            }
        ])
    ],
    test: {
        include: ["src/**/*.{test,spec}.{js,ts}"]
    }
});
