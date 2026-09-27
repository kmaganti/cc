// Preserve legacy notification records; reject malformed data rather than discard it.
export function normalizeNotifications(value) {
 if(value==null)return [];
 const jobs=Array.isArray(value)?value:typeof value==='object'?Object.values(value):null;
 if(!jobs||jobs.some(job=>!job||typeof job!=='object'||Array.isArray(job))) {
  throw new Error('Invalid notifications in store.json. Restore the notifications field from a backup; existing data has not been overwritten.');
 }
 return jobs;
}
