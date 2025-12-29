import { db } from "$lib/server/surreal"
import accountRegisteredQuery from "./accountRegistered.surql"

export default async () => {
	// The wrapper in surreal.ts already flattens single-statement queries.
	// We just need to grab the first value safely.
	const result = await db.query<boolean[]>(accountRegisteredQuery)
	
	// If the query returns [true], result is now true.
	// If the query returns [[true]], result is [true].
	// This handles both cases safely:
	return Array.isArray(result) ? result[0] : result
}
