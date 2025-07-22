export class ResponseCache {
    constructor(maxSize = 100, defaultTTL = 300000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
        this.accessTimes = new Map();
    }

    set(key, value, ttl = this.defaultTTL) {
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }

        const expirationTime = Date.now() + ttl;
        this.cache.set(key, { value, expirationTime });
        this.accessTimes.set(key, Date.now());
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expirationTime) {
            this.cache.delete(key);
            this.accessTimes.delete(key);
            return null;
        }

        this.accessTimes.set(key, Date.now());
        return entry.value;
    }

    has(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (Date.now() > entry.expirationTime) {
            this.cache.delete(key);
            this.accessTimes.delete(key);
            return false;
        }

        return true;
    }

    delete(key) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
    }

    clear() {
        this.cache.clear();
        this.accessTimes.clear();
    }

    evictLRU() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, time] of this.accessTimes) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.accessTimes.delete(oldestKey);
        }
    }

    cleanup() {
        const now = Date.now();
        const expiredKeys = [];

        for (const [key, entry] of this.cache) {
            if (now > entry.expirationTime) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            this.cache.delete(key);
            this.accessTimes.delete(key);
        }
    }

    size() {
        return this.cache.size;
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
        };
    }
}

export class InventoryCache extends ResponseCache {
    constructor() {
        super(50, 180000);
        this.gemCache = new Map();
        this.lastInventoryUpdate = 0;
    }

    parseInventory(inventoryContent) {
        if (!inventoryContent) return null;

        const items = inventoryContent.split("`");
        const inventory = {
            gems: [],
            lootboxes: {
                normal: items.includes("050"),
                fabled: items.includes("049")
            },
            animals: [],
            timestamp: Date.now()
        };

        const gemPattern = /^0[0-4][0-9]$/;
        for (const item of items) {
            const numItem = Number(item);
            if (gemPattern.test(item)) {
                inventory.gems.push(numItem);
            }
        }

        return inventory;
    }

    updateInventory(content) {
        const parsed = this.parseInventory(content);
        if (parsed) {
            this.set("inventory", parsed, 180000);
            this.lastInventoryUpdate = Date.now();
            this.updateGemCache(parsed.gems);
        }
        return parsed;
    }

    updateGemCache(gems) {
        this.gemCache.clear();
        for (const gem of gems) {
            const tier = this.getGemTier(gem);
            if (!this.gemCache.has(tier)) {
                this.gemCache.set(tier, []);
            }
            this.gemCache.get(tier).push(gem);
        }
    }

    getGemTier(gemId) {
        const tierMap = {
            "001": "common", "002": "common", "003": "common", "004": "common", "005": "common",
            "006": "uncommon", "007": "uncommon", "008": "uncommon", "009": "uncommon", "010": "uncommon",
            "011": "rare", "012": "rare", "013": "rare", "014": "rare", "015": "rare",
            "016": "epic", "017": "epic", "018": "epic", "019": "epic", "020": "epic",
            "021": "mythical", "022": "mythical", "023": "mythical", "024": "mythical", "025": "mythical",
            "026": "legendary", "027": "legendary", "028": "legendary", "029": "legendary", "030": "legendary",
            "031": "fabled", "032": "fabled", "033": "fabled", "034": "fabled", "035": "fabled"
        };
        return tierMap[String(gemId).padStart(3, '0')] || "unknown";
    }

    getGemsForTiers(allowedTiers) {
        const availableGems = [];
        for (const tier of allowedTiers) {
            const gems = this.gemCache.get(tier) || [];
            availableGems.push(...gems);
        }
        return availableGems;
    }

    hasLootboxes() {
        const inventory = this.get("inventory");
        return inventory ? inventory.lootboxes : { normal: false, fabled: false };
    }

    isInventoryFresh() {
        return Date.now() - this.lastInventoryUpdate < 120000;
    }
}

export const inventoryCache = new InventoryCache();
export const responseCache = new ResponseCache();
