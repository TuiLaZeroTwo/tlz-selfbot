import { logger } from "../../utils/logger.js";
import { MessageEmbed, WebhookClient } from "discord.js-selfbot-v13";
export class WebhookNotifier {
    async execute({ agent }, payload) {
        if (!agent.config.webhookURL) {
            logger.warn("Webhook URL is not configured, skipping Webhook Notifier execution.");
            return;
        }
        try {
            const { title, description, urgency, sourceUrl, imageUrl, content, fields } = payload;
            const webhook = new WebhookClient({ url: agent.config.webhookURL });
            const embed = new MessageEmbed()
                .setTitle(title)
                .setURL(sourceUrl ?? "")
                .setDescription(description)
                .setColor(urgency === "critical"
                ? "#FF0000"
                : "#00FF00")
                .setFooter({
                text: "Copyright BKI Kyou Izumi © 2022-2025",
                iconURL: "https://i.imgur.com/EqChQK1.png",
            })
                .setTimestamp();
            if (imageUrl)
                embed.setImage(imageUrl);
            if (fields)
                embed.addFields(fields);
            await webhook.send({
                username: "Captcha The Detective",
                content,
                avatarURL: agent.client.user?.displayAvatarURL() ??
                    "https://i.imgur.com/9wrvM38.png",
                embeds: [embed],
            });
        }
        catch (error) {
            logger.error("Failed to send webhook notification:");
            logger.error(error instanceof Error ? error.message : String(error));
        }
    }
}
