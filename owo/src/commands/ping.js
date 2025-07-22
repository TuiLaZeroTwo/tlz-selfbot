import { Schematic } from "../structure/Schematic.js";
export default Schematic.registerCommand({
    name: "ping",
    description: "commands.ping.description",
    usage: "ping",
    execute: async ({ agent, message, t }) => {
        const latency = Date.now() - message.createdTimestamp;
        message.reply({
            content: `🏓 | ${t("commands.ping.response", {
                latency: latency,
                wsLatency: agent.client.ws.ping
            })}`
        });
    }
});
