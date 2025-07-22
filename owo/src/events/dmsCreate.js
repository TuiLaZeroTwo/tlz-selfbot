import { Schematic } from "../structure/Schematic.js";
export default Schematic.registerEvent({
    name: "dmsCreate",
    event: "messageCreate",
    handler: async ({ agent }, message) => {
        if (!agent.captchaDetected || message.channel.type !== "DM")
            return;
        if (!agent.config.adminID || message.author.id !== agent.config.adminID)
            return;
        if (/^\w{3,6}$/.test(message.content)) {
            const owo = await message.client.users.fetch(agent.owoID).catch(() => null);
            const dms = await owo?.createDM();
            if (!owo || !dms) {
                message.reply("Failed to fetch OWO user or create DM channel.");
                return;
            }
            const res = await agent.awaitResponse({
                trigger: () => agent.send(message.content, { channel: dms }),
                filter: m => m.author.id === owo.id
                    && m.channel.type === "DM"
                    && /(wrong verification code!)|(verified that you are.{1,3}human!)|(have been banned)/gim.test(m.content)
            });
            return message.reply(res?.content || "No response received from OWO user.");
        }
    }
});
