import { Schematic } from "../structure/Schematic.js";
import { logger } from "../utils/logger.js";
export default Schematic.registerEvent({
    name: "commandCreate",
    event: "messageCreate",
    handler: async (BaseParams, message) => {
        const { agent, t, locale } = BaseParams;
        if (message.author.bot)
            return;
        if (!agent.config.prefix || !message.content.startsWith(agent.config.prefix))
            return;
        if (!agent.authorizedUserIDs.includes(message.author.id))
            return;
        const args = message.content
            .slice(agent.config.prefix.length)
            .trim()
            .split(/ +/g);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName)
            return;
        const command = (agent.commands.get(commandName) ||
            Array.from(agent.commands.values()).find((c) => c.aliases?.includes(commandName)));
        if (!command)
            return;
        try {
            const params = { ...BaseParams, message, args };
            await command.execute(params);
        }
        catch (error) {
            logger.error(`Error executing command "${commandName}":`);
            logger.error(error);
        }
    },
});
