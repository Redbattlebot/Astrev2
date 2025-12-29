import {
	type Prettify,
	type QueryParameters,
	Surreal,
	RecordId as SurrealRecordId,
} from "surrealdb"
import { building } from "$app/environment"
import initQuery from "$lib/server/init.surql"
import logo from "$lib/server/logo"
import fs from "node:fs"
import path from "node:path"

// --- 1. CONFIGURATION ---
const DB_CONFIG = {
	url: "wss://rosilo-06dmf6lsidp67225aee6c67su4.aws-usw2.surreal.cloud/rpc",
	ns: "rosilo",
	db: "rosilo",
	user: "rosilo_owner",
	pass: "Ewt%gu(sn9s%MgU*UGxMPKs" 
};

// --- 2. EXPORTS & SMART WRAPPER ---
export const db = new Surreal()

const ogq = db.query.bind(db)
const retriable = "This transaction can be retried"

/**
 * SMART WRAPPER:
 * 1. Injects Namespace/DB context.
 * 2. FLATTENS results: If the query has 1 statement, it returns the result set directly.
 */
db.query = async <T extends unknown[]>(
	...args: QueryParameters
): Promise<Prettify<T>> => {
	try {
		if (typeof args[0] === 'string' && !args[0].trim().startsWith('USE ')) {
			args[0] = `USE NS ${DB_CONFIG.ns} DB ${DB_CONFIG.db}; ${args[0]}`;
		}

		const raw = await ogq(...args);

		// THE FLATTENER: If it's a single statement query, return the inner array.
		if (Array.isArray(raw) && raw.length === 1) {
			return raw[0] as Prettify<T>;
		}

		return raw as Prettify<T>
	} catch (err) {
		const e = err as Error
		if (e.message.endsWith(retriable)) {
			console.log("🔄 Retrying query...");
			return await db.query(...args);
		}
		console.error(`❌ Database Query Error: ${e.message}`);
		throw e;
	}
}

export const version = db.version.bind(db)

// --- 3. AUTHENTICATION LOGIC ---
async function reconnect() {
	for (let attempt = 1; ; attempt++) {
		try {
			if (db.status === 'open') await db.close();
			
			console.log(`🚀 [Attempt ${attempt}] Connecting to SurrealDB Cloud...`);
			await db.connect(DB_CONFIG.url);
			
			await db.signin({
				username: DB_CONFIG.user,
				password: DB_CONFIG.pass,
			} as any);

			await db.use({ ns: DB_CONFIG.ns, db: DB_CONFIG.db });
			
			console.log("✅ AUTH SUCCESS: Connection established.");
			break;
		} catch (err) {
			const e = err as Error;
			console.error(`❌ Connection failed: ${e.message}`);
			if (attempt >= 3) {
				console.error("🛑 Critical: Failed to connect after 3 attempts.");
				break;
			}
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
	}
}

// --- 4. STARTUP & SCHEMA INITIALIZATION ---
if (!building) {
	// Debugging path issues for Linux/Render
	const cssPath = path.resolve(process.cwd(), "Assets/Themes/Standard.css");
	if (!fs.existsSync(cssPath)) {
		console.warn(`⚠️ ASSET WARNING: CSS file not found at ${cssPath}.`);
	}

	await reconnect(); 
	await new Promise(resolve => setTimeout(resolve, 500));

	try {
		console.log("🛠️ Initializing Schema...");
		// We use ogq directly here to bypass the flattener for the large initQuery script
		await ogq(`USE NS ${DB_CONFIG.ns} DB ${DB_CONFIG.db}; ${initQuery}`); 
		console.log("✅ Schema Synced.");
		logo();
	} catch (err) {
		console.error("❌ Schema sync failed:", (err as Error).message);
	}
}

// --- 5. HELPER TYPES & FUNCTIONS ---
type RecordIdTypes = {
	asset: number; auditLog: string; banner: string; comment: string;
	created: string; createdAsset: string; dislikes: string; follows: string;
	forumCategory: string; friends: string; group: string; hasSession: string;
	imageAsset: string; in: string; likes: string; moderation: string;
	notification: string; ownsAsset: string; ownsGroup: string; ownsPlace: string;
	place: number; playing: string; posted: string; recentlyWorn: string;
	regKey: string; render: string; report: string; request: string;
	session: string; stuff: string; thumbnailCache: number; used: string;
	user: string; wearing: string;
}

export type RecordId<T extends keyof RecordIdTypes> = SurrealRecordId<T>
export const Record = <T extends keyof RecordIdTypes>(table: T, id: RecordIdTypes[T]) => new SurrealRecordId(table, id)

export async function find<T extends keyof RecordIdTypes>(table: T, id: RecordIdTypes[T]) {
	const result = await db.query<boolean[]>("!!SELECT 1 FROM $thing", { thing: Record(table, id) })
    // With flattener, result is already the inner array
	return result ? result[0] : undefined;
}

export async function findWhere(table: keyof RecordIdTypes, where: string, params?: { [_: string]: unknown }) {
	const res = await db.query<boolean[]>(`!!SELECT 1 FROM type::table($table) WHERE ${where}`, { ...params, table })
    // With flattener, res is already the inner array
	return res ? res[0] : undefined;
}
