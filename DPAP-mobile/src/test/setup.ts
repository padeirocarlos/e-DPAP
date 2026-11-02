/**
 * Test setup: install a fake IndexedDB so Dexie runs in Node. Imported before
 * any test module touches the database (see vitest `setupFiles`).
 */
import "fake-indexeddb/auto";
