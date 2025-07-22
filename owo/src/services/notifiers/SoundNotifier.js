import { logger } from "../../utils/logger.js";
import { spawn } from "node:child_process";
export class SoundNotifier {
    async execute({ agent }, payload) {
        // Don't play sounds for normal-urgency notifications
        if (payload.urgency === "normal" || !agent.config.musicPath) {
            return;
        }
        let command;
        let args;
        switch (process.platform) {
            case "win32":
                // Using powershell is more robust than `start`.
                command = "powershell";
                args = ["-c", `(New-Object Media.SoundPlayer "${agent.config.musicPath}").PlaySync();`];
                break;
            case "darwin":
                command = "afplay";
                args = [agent.config.musicPath];
                break;
            case "linux":
                // Check for common players, defaulting to aplay.
                command = "aplay"; // or paplay, etc.
                args = [agent.config.musicPath];
                break;
            case "android":
                command = "termux-media-player";
                args = ["play", agent.config.musicPath];
                break;
            default:
                logger.warn(`Sound notifications are not supported on platform: ${process.platform}`);
                return;
        }
        try {
            logger.debug(`Executing sound command: ${command} ${args.join(" ")}`);
            const child = spawn(command, args, { shell: false, detached: true });
            // unref() allows the main process to exit even if the sound is playing.
            child.unref();
        }
        catch (error) {
            logger.error("Failed to play sound notification:");
            logger.error(error);
        }
    }
}
