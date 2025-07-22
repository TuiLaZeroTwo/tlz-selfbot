import { Schematic } from "../structure/Schematic.js";
export default Schematic.registerCommand({
    name: "say",
    description: "commands.say.description",
    usage: "say [#channel|channelId] <message>",
    execute: async ({ agent, message, t, args }) => {
        if (!args || !args.length) {
            return message.reply({
                content: t("commands.say.noMessage")
            });
        }
        let targetChannel = agent.activeChannel;
        let messageContent = args.join(" ");
        // Check if first argument is a channel mention or channel ID
        const firstArg = args[0];
        if (firstArg) {
            const channelMention = firstArg.match(/^<#(\d+)>$/);
            const channelId = channelMention ? channelMention[1] : firstArg;
            // Try to find the channel
            if (channelId && /^\d+$/.test(channelId)) {
                const channel = message.guild?.channels.cache.get(channelId);
                if (channel && channel.isText()) {
                    if (!channel.permissionsFor(agent.client.user)?.has("SEND_MESSAGES")) {
                        return message.reply(t("commands.common.errors.noPermission"));
                    }
                    targetChannel = channel;
                    // Remove the channel argument from the message content
                    messageContent = args.slice(1).join(" ");
                    if (!messageContent.trim()) {
                        return message.reply({
                            content: t("commands.say.noMessage")
                        });
                    }
                }
            }
        }
        if (!targetChannel) {
            return message.reply({
                content: t("commands.common.errors.invalidChannel")
            });
        }
        // Set the target channel temporarily and send the message
        const originalChannel = agent.activeChannel;
        agent.activeChannel = targetChannel;
        await agent.send(messageContent);
        agent.activeChannel = originalChannel;
        message.reply({
            content: t("commands.say.success")
        });
    }
});
