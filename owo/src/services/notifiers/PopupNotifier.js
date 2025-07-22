import { logger } from "../../utils/logger.js";
import notifier from "node-notifier";
import path from "node:path";
import { exec, spawn } from "node:child_process";
export class PopupNotifier {
    async execute({}, payload) {
        // Don't show popups for normal-urgency notifications
        if (payload.urgency === "normal") {
            return;
        }
        try {
            if (process.platform === "android") {
                this.handleTermuxPopup(payload);
            }
            else {
                this.handleDesktopPopup(payload);
            }
        }
        catch (error) {
            logger.error("Failed to display popup notification:");
            logger.error(error);
        }
    }
    handleTermuxPopup(payload) {
        const args = [
            "--title", payload.title,
            "--content", payload.description,
            "--priority", "high",
            "--sound",
            "--vibrate", "1000",
            "--id", "owo-farm-captcha", // Consistent ID
        ];
        if (payload.sourceUrl) {
            args.push("--action", `termux-open-url ${payload.sourceUrl}`);
        }
        const child = spawn("termux-notification", args);
        child.unref();
    }
    handleDesktopPopup(payload) {
        notifier.notify({
            title: payload.title,
            message: payload.description,
            icon: path.resolve(process.cwd(), "assets/icon.png"), // Use a local asset
            wait: true, // Wait for user action
            ...this.getPlatformSpecificOptions(),
        }, (err, response) => {
            if (err) {
                logger.error("node-notifier callback error:");
                logger.error(err);
                return;
            }
            // If the notification was clicked (not dismissed or timed out) and has a URL, open it.
            if (response !== "dismissed" && response !== "timeout" && payload.sourceUrl) {
                const openCommand = this.getOpenCommand(payload.sourceUrl);
                exec(openCommand).unref();
            }
        });
    }
    getPlatformSpecificOptions() {
        if (process.platform === "win32") {
            return {
                sound: "Notification.Looping.Call", // A more urgent sound for Windows
                appID: "Advanced OwO Tool Farm",
            };
        }
        if (process.platform === "darwin") {
            return { sound: true };
        }
        return {}; // Default for Linux etc.
    }
    getOpenCommand(url) {
        const sanitizedUrl = url.replace(/"/g, ""); // Basic sanitization
        switch (process.platform) {
            case "win32":
                return `start "" "${sanitizedUrl}"`;
            case "darwin":
                return `open "${sanitizedUrl}"`;
            default: // Linux and others
                return `xdg-open "${sanitizedUrl}"`;
        }
    }
}
