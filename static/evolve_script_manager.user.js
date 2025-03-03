// ==UserScript==
// @name         Evolve Script Manager
// @description  Communication bridge between the game and the manager tabs
// @version      0.1.1
// @author       Sneed
// @namespace    http://tampermonkey.net/
// @match        https://roman-vorobiov.github.io/evolve_script_manager/
// @match        https://pmotschmann.github.io/Evolve/
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener

// ==/UserScript==

(async function() {
    "use strict";

    function onMessage(callback) {
        GM_addValueChangeListener("evolve_script_manager.events", (key, oldValue, newValue) => {
            callback(newValue);
        });
    }

    function sendMessage(message) {
        GM_setValue("evolve_script_manager.events", { timestamp: Date.now(), ...message });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function synchronize() {
        while (!("importAutomationSettings" in unsafeWindow)) {
            await sleep(100);
        }
    }

    if (window.location.href.startsWith("https://pmotschmann.github.io/Evolve")) {
        const originalConfirm = unsafeWindow.confirm;

        await synchronize();

        onMessage(message => {
            unsafeWindow.confirm = () => true;
            try {
                unsafeWindow.importAutomationSettings(message.config);
            }
            finally {
                unsafeWindow.confirm = originalConfirm;
            }
        });
    }
    else {
        unsafeWindow.sendMessageToEvolveTab = sendMessage;
    }
})();
