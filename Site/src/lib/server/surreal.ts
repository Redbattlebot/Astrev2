import {
	type Prettify,
	type QueryParameters,
	Surreal,
	RecordId as SurrealRecordId,
} from "surrealdb"
import { building } from "$app/environment"
import initQuery from "$lib/server/init.surql"
import logo from "$lib/server/logo"

// --- 1. DATABASE INITIALIZATION ---
// Exported so other files can import { db }
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

// --- 2. AUTHENTICATION LOGIC ---
async function reconnect() {
	for (let attempt = 1; ; attempt++) {
		try {
			await db.close() 
			console.log(`🚀 Attempt ${attempt}: Connecting to SurrealDB Cloud...`)
			
			// Stage A: Establish Socket
			await db.connect("wss://rosilo-06dmf6lsidp67225aee6c67su4.aws-usw2.surreal.cloud/rpc")
			
			// Stage B: Sign in with ROOT access
			// This 'access' key is the fix for the "IAM: Not enough permissions" error
			await db.signin({
				user: "rosilo_admin",
				pass: "YOUR_PASSWORD_HERE", // <-- Put your actual password here
				access: "root"
			})

			// Stage C: Select Context
			await db.use({ ns: "Rosilo", db: "rosilo" })
			
			console.log("✅ AUTH SUCCESS! Connected to Rosilo/rosilo as Owner.")
			console.log("DB Version:", await version())
			break
		} catch (err) {
			const e = err as Error
			console.error(`❌ Connection failed: ${e.message}`)
			
			// Fallback: If 'user' key fails, try 'username' key
			if (e.message.includes("username is missing")) {
				try {
					await db.signin({
						username: "rosilo_admin",
						password: "YOUR_PASSWORD_HERE"
					} as any)
					await db.use({ ns: "Rosilo", db: "rosilo" })
					console.log("✅ AUTH SUCCESS (via username fallback)")
					break
				} catch (inner) {
					console.error("❌ Fallback auth also failed.")
				}
			}

			if (attempt >= 3) {
				console.error("Giving up after 3 attempts. Please verify rosilo_admin is a ROOT owner.")
				break
			}
			await new Promise(resolve => setTimeout(resolve, 2000))
		}
	}
}

// Only run connection logic if we aren't in the middle of a 'build'
if (!building) {
	await reconnect()
	// Runs your initial table/schema setup
	await db.query(initQuery)
	logo()
}

// --- 3. TYPE DEFINITIONS & HELPERS ---
// Kept so your API routes ($lib/server/surreal) find their exports
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
