import { Schematic } from "../structure/Schematic.js";
import { formatTime } from "../utils/time.js";
export default Schematic.registerCommand({
    name: "uptime",
    description: "commands.uptime.description",
    usage: "uptime",
    execute: async ({ agent, message, t }) => {
        const uptime = formatTime(agent.client.readyTimestamp, Date.now());
        message.reply({
            content: t("commands.uptime.response", { uptime })
        });
    }
});
