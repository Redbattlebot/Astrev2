import {
	type Prettify,
	type QueryParameters,
	Surreal,
	RecordId as SurrealRecordId,
} from "surrealdb"
import { building } from "$app/environment"
import initQuery from "$lib/server/init.surql"
import logo from "$lib/server/logo"
import config from "./config" // Uses your mercury.core.ts config

// --- DATABASE INITIALIZATION ---

export const db = new Surreal()

// Retry queries logic
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

// Use the URL from mercury.core.ts (Ensure it is wss://.../rpc)
const realUrl = new URL(config.DatabaseURL)

async function reconnect() {
	for (let attempt = 0; ; attempt++) {
		try {
			await db.close() 
			console.log(`Connecting to SurrealDB Cloud (Attempt ${attempt + 1})...`)
			
			await db.connect(realUrl, {
				namespace: config.DatabaseNamespace,
				database: config.DatabaseName,
				auth: {
					username: config.DatabaseUser,
					password: config.DatabasePass,
				},
			})
			
			console.log("✅ Connected to SurrealDB Cloud! Version:", await version())
			break
		} catch (err) {
			const e = err as Error
			console.error("❌ Failed to connect to database:", e.message)
			
			if (attempt >= 5) {
				console.log("Max retries reached. Verify your SURREAL_PASS and URL in Render.")
			}
			
			console.log("Retrying connection in 2 seconds...")
			await new Promise(resolve => setTimeout(resolve, 2000))
		}
	}
}

// Only run connection logic if we aren't in a build step
if (!building) {
	await reconnect()
	await db.query(initQuery)
	logo()
}

// --- TYPE DEFINITIONS ---

type RecordIdTypes = {
	asset: number
	auditLog: string
	banner: string
	comment: string
	created: string
	createdAsset: string
	dislikes: string
	follows: string
	forumCategory: string
	friends: string
	group: string
	hasSession: string
	imageAsset: string
	in: string
	likes: string
	moderation: string
	notification: string
	ownsAsset: string
	ownsGroup: string
	ownsPlace: string
	place: number
	playing: string
	posted: string
	recentlyWorn: string
	regKey: string
	render: string
	report: string
	request: string
	session: string
	stuff: string
	thumbnailCache: number
	used: string
	user: string
	wearing: string
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
