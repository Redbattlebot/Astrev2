import {
	type Prettify,
	type QueryParameters,
	Surreal,
	RecordId as SurrealRecordId,
} from "surrealdb"
import { building } from "$app/environment"
import initQuery from "$lib/server/init.surql"
import logo from "$lib/server/logo"

// 1. Export the DB instance so other files can find it
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
	for (let attempt = 1; ; attempt++) {
		try {
			await db.close() 
			console.log(`🚀 Attempt ${attempt}: Connecting to SurrealDB Cloud...`)
			
			// STAGE 1: Establish the Socket Connection
			await db.connect("wss://rosilo-06dmf6lsidp67225aee6c67su4.aws-usw2.surreal.cloud/rpc")
			
			// STAGE 2: Sign in with your Owner account
			// Using signin() is often more successful than putting auth in connect()
			await db.signin({
				user: "rosilo_admin",
				pass: "YOUR_ACTUAL_PASSWORD_HERE", // Replace with your password
			})

			// STAGE 3: Select the Namespace and Database
			await db.use({ ns: "Rosilo", db: "rosilo" })
			
			console.log("✅ AUTH SUCCESS! Connected to Rosilo/rosilo as rosilo_admin")
			console.log("DB Version:", await version())
			break
		} catch (err) {
			const e = err as Error
			console.error(`❌ Connection failed: ${e.message}`)
			
			if (attempt >= 5) {
				console.error("MAX ATTEMPTS REACHED. Please check if rosilo_admin exists in Cloud Console.")
				break
			}
			
			await new Promise(resolve => setTimeout(resolve, 2000))
		}
	}
}

// Only start the connection if we aren't currently building the project
if (!building) {
	await reconnect()
	await db.query(initQuery)
	logo()
}

// --- HELPER TYPES & FUNCTIONS ---
// These ensure the rest of your app (API routes) doesn't break during build

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
