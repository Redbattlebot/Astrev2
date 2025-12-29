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
// Exported so that your API routes and other server files can use it.
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

// --- 2. AUTHENTICATION LOGIC (Optimized for rosilo_owner) ---
async function reconnect() {
	for (let attempt = 1; ; attempt++) {
		try {
			// Close any existing zombie connections
			await db.close() 
			console.log(`🚀 Attempt ${attempt}: Connecting as System Root (rosilo_owner)...`)
			
			// STEP A: Establish the WebSocket connection
			await db.connect("wss://rosilo-06dmf6lsidp67225aee6c67su4.aws-usw2.surreal.cloud/rpc")
			
			// STEP B: Sign in to the ROOT level
			// Per your screenshot, rosilo_owner is a System User at the Root level.
			// We do NOT specify NS/DB here so the IAM checks the global Root table.
			await db.signin({
				username: "rosilo_owner",
				password: "YOUR_PASSWORD_HERE", // <-- Put the password for rosilo_owner here
				access: "root"
			} as any)

			// STEP C: Switch to the specific Namespace and Database
			await db.use({ ns: "Rosilo", db: "rosilo" })
			
			console.log("✅ AUTH SUCCESS! Full System Root permissions granted.")
			console.log("Connected to Database Version:", await version())
			break
		} catch (err) {
			const e = err as Error
			console.error(`❌ Connection failed: ${e.message}`)
			
			if (attempt >= 3) {
				console.error("MAX ATTEMPTS REACHED. Please verify the password for 'rosilo_owner' in the Cloud Console.")
				break
			}
			
			// Wait 2 seconds before retrying
			await new Promise(resolve => setTimeout(resolve, 2000))
		}
	}
}

// Prevent the connection from running during the SvelteKit build/static generation phase
if (!building) {
	await reconnect()
	// Run the schema initialization (tables, indexes, etc.)
	await db.query(initQuery)
	logo()
}

// --- 3. HELPER TYPES & RECORD FUNCTIONS ---
// These ensure the rest of your project's server-side code continues to function.

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
