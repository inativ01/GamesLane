import type { CapacitorConfig } from "@capacitor/cli";

// The server the app shows, chosen when the app is built (npm run sync) by the GAMESLANE_SERVER environment variable:
// unset for production, a pull request's number (e.g. 42) for its preview server, or a full address such as
// http://localhost:5171 for a server running locally.
function serverUrl(value: string | undefined): string {
    const server = value?.trim() ?? "";
    if (server === "") {
        return "https://gameslane.onrender.com";
    }
    if (/^\d+$/.test(server)) {
        return `https://gameslane-pr-${server}.onrender.com`;
    }
    return server.replace(/\/+$/, "");
}

const config: CapacitorConfig = {
    appId: "com.gameslane.app",
    appName: "GamesLane",
    webDir: "www",
    backgroundColor: "#f5f1ea",
    server: {
        url: serverUrl(process.env.GAMESLANE_SERVER),
        // Shown when the server cannot be reached.
        errorPath: "index.html",
        // Microsoft and Discord sign-in stay in the app; other sites (including Google sign-in) open in Safari.
        allowNavigation: ["login.microsoftonline.com", "login.live.com", "account.live.com", "discord.com"],
    },
    ios: {
        // The site does not draw under the status bar or the home indicator.
        contentInset: "always",
    },
};

export default config;
