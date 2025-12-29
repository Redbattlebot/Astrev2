import {
	type Prettify,
	type QueryParameters,
	Surreal,
	RecordId as SurrealRecordId,
} from "surrealdb"
import { building } from "$app/environment"
import initQuery from "$lib/server/init.surql"
import logo from "$lib/server/logo"

// --- DATABASE INITIALIZATION ---

// MUST HAVE 'export' HERE SO OTHER FILES CAN USE IT
export const db = new Surreal()

const ogq = db.query.bind(db)
const retriable = "This transaction can be retried"

db.query = async <T extends unknown[]>(
	...args: QueryParameters
): Promise<Prettify<T>> => {
	try {
		return (await ogq(...args)) as Prettify<T>
	} catch (err) {
		const e = err as Error
		if (!e.message.endsWith(retriable)) throw e
		console.log("Retrying query:", e.message)
	}
	return await db.query(...args)
}

export const version = db.version.bind(db)

async function reconnect() {
	for (let attempt = 0; ; attempt++) {
		try {
			await db.close() 
			console.log("🚀 STARTING HARDCODED AUTH TEST...")
			
			// Replace these strings with your actual Cloud details
			await db.connect(new URL("wss://rosilo-06dmf6lsidp67225aee6c67su4.aws-usw2.surreal.cloud/rpc"), {
				namespace: "YOUR_NAMESPACE_HERE", 
				database: "YOUR_DATABASE_HERE",
				auth: {
					username: "root",
					password: "YOUR_PASSWORD_HERE",
				},
			})
			
			console.log("✅ HARDCODED TEST SUCCESS! Version:", await version())
			break
		} catch (err) {
			const e = err as Error
			console.error("❌ Hardcoded test failed:", e.message)
			if (attempt >= 3) {
				console.log("Giving up after 3 attempts. Check credentials.")
				break
			}
			console.log("Retrying in 2 seconds...")
			await new Promise(resolve => setTimeout(resolve, 2000))
		}
	}
}

if (!building) {
	await reconnect()
	await db.query(initQuery)
	logo()
}

// --- TYPE DEFINITIONS (Kept so build succeeds) ---

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

export const Record = <T extends keyof RecordIdTypes>(
	table: T,
	id: RecordIdTypes[T]
) => new SurrealRecordId(table, id)

export async function find<T extends keyof RecordIdTypes>(
	table: T,
	id: RecordIdTypes[T]
) {
	const [result] = await db.query<boolean[]>("!!SELECT 1 FROM $thing", {
		thing: Record(table, id),
	})
	return result
}

export async function findWhere(
	table: keyof RecordIdTypes,
	where: string,
	params?: { [_: string]: unknown }
) {
	const [res] = await db.query<boolean[]>(
		`!!SELECT 1 FROM type::table($table) WHERE ${where}`,
		{ ...params, table }
	)
	return res
}
