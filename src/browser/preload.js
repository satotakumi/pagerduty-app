const { contextBridge, ipcRenderer} = require("electron");
contextBridge.exposeInMainWorld(
    "api", {
        saveConfig: (apiKey, userId) => {
            ipcRenderer.send("save_config", {apiKey, userId});
        },
        on: (channel, func) => {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
);