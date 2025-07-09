const logger = require("../utils/logger");

module.exports = async (client, config) => {
    logger.info("User info Command initialized");

    client.on("messageCreate", async (message) => {
        if (!message.content.startsWith(config.prefix) || message.author.bot || message.author.id != config.ownerID) return;
        const args = message.content.slice(config.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === "userinfo") {
            const user = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;

            if (!message.guild) {
                const userCreated = user.createdAt.toDateString();
                const text = `\`\`\`Username: ${user.username}\nID: ${user.id}\nAccount Created: ${userCreated}\nAvatar: ${user.displayAvatarURL({ dynamic: true })}\n\`\`\``;
                message.channel.send(text);
            } else {
                const member = message.guild.members.cache.get(user.id) || await message.guild.members.fetch(user.id).catch(() => null);

                if (member) {
                    const joinedAt = member.joinedAt ? member.joinedAt.toDateString() : "N/A";
                    const roles = member.roles.cache.size > 1 ? member.roles.cache.filter(r => r.id !== message.guild.id).map(role => role.name).join(", ") : "None";
                    const text = `\`\`\`Username: ${user.username}\nID: ${user.id}\nAccount Created: ${user.createdAt.toDateString()}\nJoined Server: ${joinedAt}\nRoles: ${roles}\nAvatar: ${user.displayAvatarURL({ dynamic: true })}\n\`\`\``;
                    message.channel.send(text);
                } else {
                    const text = `\`\`\`Username: ${user.username}\nID: ${user.id}\nAccount Created: ${user.createdAt.toDateString()}\nAvatar: ${user.displayAvatarURL({ dynamic: true })}\n\`\`\``;
                    message.channel.send(text);
                }
            }
        }
    });
};