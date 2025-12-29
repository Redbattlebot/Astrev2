import {
	type Prettify,
	type QueryParameters,
	Surreal,
	RecordId as SurrealRecordId,
} from "surrealdb"
import { building } from "$app/environment"
import initQuery from "$lib/server/init.surql"
import logo from "$lib/server/logo"

// --- 1. EXPORTS ---
// These MUST be exported so your API routes and other files can import them
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
			console.log(`🚀 Attempt ${attempt}: Connecting as System Root (rosilo_owner)...`)
			
			// Establish connection to your Cloud instance
			await db.connect("wss://rosilo-06dmf6lsidp67225aee6c67su4.aws-usw2.surreal.cloud/rpc")
			
			// Sign in using the Root user from your screenshot
			// 'access: "root"' ensures you have permissions to run initQuery
			await db.signin({
				username: "rosilo_owner",
				password: "Protogenslol1", // <-- Put your actual password here
				access: "root",
				namespace: undefined,
				database: undefined
			} as any)

			// Select the target Namespace and Database
			await db.use({ ns: "Rosilo", db: "rosilo" })
			
			console.log("✅ AUTH SUCCESS! Root session established.")
			break
		} catch (err) {
			const e = err as Error
			console.error(`❌ Connection failed: ${e.message}`)
			
			// Fallback: If Root access is rejected, try Namespace-level access
			if (attempt === 1) {
				try {
					console.log("🔄 Retrying with Namespace Scope...")
					await db.signin({
						username: "rosilo_owner",
						password: "YOUR_PASSWORD_HERE",
						namespace: "Rosilo",
						database: "rosilo",
						access: "namespace" 
					} as any)
					console.log("✅ AUTH SUCCESS (Namespace Level)")
					break
				} catch (inner) { 
					console.error("❌ Namespace fallback failed:", (inner as Error).message) 
				}
			}

			if (attempt >= 3) {
				console.error("MAX ATTEMPTS REACHED. Please check credentials in Cloud Console.")
				break
			}
			await new Promise(resolve => setTimeout(resolve, 2000))
		}
	}
}

// Only run the connection if the app is starting up (not during build)
if (!building) {
	await reconnect()
	await db.query(initQuery)
	logo()
}

// --- 3. HELPER TYPES & FUNCTIONS ---
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
