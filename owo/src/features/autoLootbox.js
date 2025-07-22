import { Schematic } from "../structure/Schematic.js";
import { ranInt, humanLikeDelay } from "../utils/math.js";
import { logger } from "../utils/logger.js";
import { inventoryCache } from "../utils/cache.js";
import { defaultRetryManager } from "../utils/retry.js";

export default Schematic.registerFeature({
    name: "autoLootbox",
    cooldown: () => ranInt(30000, 60000),
    condition: async ({ agent }) => {
        if (!agent.config.autoLootbox && !agent.config.autoFabledLootbox) {
            return false;
        }
        
        const lootboxes = inventoryCache.hasLootboxes();
        return lootboxes.normal || lootboxes.fabled;
    },
    run: async ({ agent, t, locale }) => {
        const lootboxOperation = async () => {
            let inventory = inventoryCache.get("inventory");
            
            if (!inventory || !inventoryCache.isInventoryFresh()) {
                const invMsg = await agent.awaitResponse({
                    trigger: () => agent.send("inv"),
                    filter: (m) => m.author.id === agent.owoID
                        && m.content.includes(m.guild?.members.me?.displayName)
                        && m.content.includes("Inventory"),
                    expectResponse: true,
                    cacheKey: "inventory",
                    cacheTTL: 120000
                });
                
                if (!invMsg) return;
                inventory = inventoryCache.updateInventory(invMsg.content);
            }
            
            if (!inventory) return;
            
            const lootboxes = inventory.lootboxes;
            let opened = false;
            
            if (agent.config.autoFabledLootbox && lootboxes.fabled) {
                logger.info("Opening fabled lootboxes...");
                await agent.send("lb fabled");
                await agent.client.sleep(humanLikeDelay(4000, 0.3));
                opened = true;
            }
            
            if (agent.config.autoLootbox && lootboxes.normal) {
                if (opened) {
                    await agent.client.sleep(humanLikeDelay(2000, 0.4));
                }
                
                logger.info("Opening normal lootboxes...");
                await agent.send("lb all");
                await agent.client.sleep(humanLikeDelay(3000, 0.3));
                opened = true;
            }
            
            if (opened) {
                inventoryCache.delete("inventory");
                
                const openDelay = humanLikeDelay(ranInt(8000, 15000), 0.2);
                logger.debug(`Waiting ${Math.floor(openDelay / 1000)}s for lootboxes to process...`);
                await agent.client.sleep(openDelay);
                
                const newInvMsg = await agent.awaitResponse({
                    trigger: () => agent.send("inv"),
                    filter: (m) => m.author.id === agent.owoID
                        && m.content.includes(m.guild?.members.me?.displayName)
                        && m.content.includes("Inventory"),
                    expectResponse: true
                });
                
                if (newInvMsg) {
                    inventoryCache.updateInventory(newInvMsg.content);
                }
            }
        };

        try {
            await defaultRetryManager.executeWithRetry(lootboxOperation, {
                maxRetries: 2,
                baseDelay: 3000,
                operationId: 'autoLootbox',
                retryCondition: (error) => {
                    return error.message.includes('timeout') || error.message.includes('network');
                }
            });
        } catch (error) {
            logger.error(`Lootbox operation failed: ${error.message}`);
            return humanLikeDelay(120000, 0.3);
        }
    }
});
