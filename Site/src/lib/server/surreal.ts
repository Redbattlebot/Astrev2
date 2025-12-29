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
            await db.close();
            console.log(`🚀 Attempt ${attempt}: Using Legacy Root Auth...`);
            
            await db.connect("wss://rosilo-06dmf6lsidp67225aee6c67su4.aws-usw2.surreal.cloud/rpc");
            
            // 1. Authenticate (This passed in your last log!)
            await db.signin({
                username: "rosilo_owner",
                password: "Protogenslol1",
            } as any);

            // 2. CRITICAL: We must AWAIT the use command 
            // before the code moves on to db.query(initQuery)
            await db.use({ ns: "Rosilo", db: "rosilo" });
            
            console.log("✅ AUTH SUCCESS! Root session established and Namespace selected.");
            break;
        } catch (err) {
            const e = err as Error;
            console.error(`❌ Connection failed: ${e.message}`);
            if (attempt >= 3) break;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// --- Authentication Execution ---
if (!building) {
    // 1. Wait for the connection AND the NS/DB selection to finish
    await reconnect(); 

    // 2. Now that we are 100% sure we are in the 'Rosilo' namespace, run the schema
    console.log("🛠️ Running initial schema query...");
    await db.query(initQuery);

    // 3. Success!
    logo();
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
