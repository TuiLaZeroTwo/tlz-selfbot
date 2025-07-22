import { Schematic } from "../structure/Schematic.js";
export default Schematic.registerCommand({
    name: "send",
    description: "commands.send.description",
    usage: "send <user> <amount>",
    execute: async ({ agent, message, t, args }) => {
        if (!message.guild) {
            return message.reply({
                content: t("commands.common.errors.guildOnly")
            });
        }
        if (!args || args.length < 2) {
            return message.reply({
                content: t("commands.send.noMessage")
            });
        }
        const [user, amount] = args;
        if (!user || !/^<@!?(\d+)>$/.test(user)) {
            return message.reply({
                content: t("commands.send.invalidUser")
            });
        }
        const guildMember = message.guild.members.cache.get(message.mentions.users.first()?.id || user.replace(/<@!?(\d+)>/, "$1"));
        if (!guildMember) {
            return message.reply({
                content: t("commands.send.invalidUser")
            });
        }
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return message.reply({
                content: t("commands.send.invalidAmount")
            });
        }
        try {
            const response = await agent.awaitResponse({
                trigger: () => agent.send(`owo give ${user} ${amount}`),
                filter: msg => msg.author.id === agent.owoID
                    && msg.embeds.length > 0
                    && !!msg.embeds[0].author?.name.includes(msg.guild?.members.me?.displayName)
                    && !!msg.embeds[0].author.name.includes(guildMember.displayName)
                    && msg.components.length > 0
                    && msg.components[0].type === "ACTION_ROW"
                    && msg.components[0].components[0].type === "BUTTON",
                time: 15000
            });
            if (!response) {
                return message.reply({
                    content: t("commands.common.errors.noResponse")
                });
            }
            const button = response.components[0].components[0];
            if (!button || button.type !== "BUTTON" || !button.customId)
                throw new Error("Invalid button response");
            await response.clickButton(button.customId);
            message.reply({
                content: t("commands.send.success", { amount, user })
            });
        }
        catch (error) {
            message.reply({
                content: t("commands.send.error", { error: String(error).slice(0, 1000) })
            });
        }
    }
});
