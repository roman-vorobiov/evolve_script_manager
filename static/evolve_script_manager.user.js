// ==UserScript==
// @name         Evolve Script Manager
// @description  Communication bridge between the game and the manager tabs
// @version      0.1.0
// @author       Roman Vorobiov
// @namespace    http://tampermonkey.net/
// @downloadURL  https://github.com/roman-vorobiov/evolve_script_manager/blob/master/static/evolve_script_manager.user.js
// @match        https://roman-vorobiov.github.io/evolve_script_manager/
// @match        https://pmotschmann.github.io/Evolve/
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener

// ==/UserScript==

(function() {
    "use strict";

    function onMessage(callback) {
        GM_addValueChangeListener("evolve_script_manager.events", (key, oldValue, newValue) => {
            callback(newValue);
        });
    }

    function sendMessage(message) {
        GM_setValue("evolve_script_manager.events", { timestamp: Date.now(), ...message });
    }

    function waitForElement(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    if (window.location.href.startsWith("https://pmotschmann.github.io/Evolve")) {
        const originalConfirm = unsafeWindow.confirm;

        onMessage(message => {
            waitForElement("#script_settingsImport").then(button => {
                const textArea = document.querySelector("#importExport");
                textArea.value = message.config;

                unsafeWindow.confirm = () => true;
                try {
                    button.click();
                }
                finally {
                    unsafeWindow.confirm = originalConfirm;
                }
            });
        });
    }
    else {
        unsafeWindow.sendMessageToEvolveTab = sendMessage;
    }
})();
