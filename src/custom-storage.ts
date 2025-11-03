/**
 * Custom Cloudflare Storage adapter that fixes the TTL issue
 * Bug: OpenAuth tries to set TTL of 59 seconds, but Cloudflare KV requires minimum 60
 * This is a workaround until the library is fixed
 */

interface StorageValue {
  value: any;
  expiresAt: number;
}

export function CustomCloudflareStorage(options: { namespace: KVNamespace }) {
  return {
    async get(key: string) {
      const result = await options.namespace.get(key, "json");
      if (!result) return;
      
      const data = result as StorageValue;
      if (data.expiresAt && Date.now() > data.expiresAt) {
        await options.namespace.delete(key);
        return;
      }
      
      return data.value;
    },
    
    async set(key: string, value: any, ttl?: number) {
      // Fix: Ensure TTL is at least 60 seconds for Cloudflare KV
      const minTTL = 60;
      const actualTTL = ttl && ttl < minTTL ? minTTL : ttl;
      
      const data: StorageValue = {
        value,
        expiresAt: actualTTL ? Date.now() + actualTTL * 1000 : 0,
      };
      
      if (actualTTL) {
        await options.namespace.put(key, JSON.stringify(data), {
          expirationTtl: actualTTL,
        });
      } else {
        await options.namespace.put(key, JSON.stringify(data));
      }
    },
    
    async delete(key: string) {
      await options.namespace.delete(key);
    },
    
    async *scan(prefix?: string): AsyncIterableIterator<string> {
      let cursor: string | undefined = undefined;
      
      do {
        const listResult: any = await options.namespace.list({
          prefix,
          cursor,
        });
        
        for (const key of listResult.keys) {
          yield key.name;
        }
        
        cursor = listResult.list_complete ? undefined : listResult.cursor;
      } while (cursor);
    },
  };
}
