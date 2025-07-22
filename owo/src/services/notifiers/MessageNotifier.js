import { t } from "../../utils/locales.js";
import { logger } from "../../utils/logger.js";
export class MessageNotifier {
    async execute({ agent }, payload) {
        if (!agent.config.adminID) {
            logger.warn(t("error.adminID.notconfigured"));
            return;
        }
        try {
            const { title, description, urgency, sourceUrl, imageUrl, content, fields } = payload;
            const admin = await agent.client.users.fetch(agent.config.adminID);
            const dms = await admin.createDM();
            let messageContent = `# Advanced Discord OwO Tool Farm Notification`;
            messageContent += `\n\n**Title:** ${title}\n\n`;
            messageContent += `**Urgency:** ${urgency}\n`;
            messageContent += `**Content:** ${content}\n`;
            messageContent += `**Description:** ${description}\n\n`;
            if (fields && fields.length > 0) {
                messageContent += fields.map(f => `**${f.name}**: ${f.value}`).join('\n');
                messageContent += `\n\n`;
            }
            if (sourceUrl) {
                messageContent += `**Source**: <${sourceUrl}>\n`;
            }
            if (imageUrl) {
                // For images, we can only send the link directly.
                messageContent += `**Image**: ${imageUrl}\n`;
            }
            await dms.send(messageContent);
        }
        catch (error) {
            logger.error("Failed to send message notification:");
            logger.error(error instanceof Error ? error.message : String(error));
        }
    }
}
