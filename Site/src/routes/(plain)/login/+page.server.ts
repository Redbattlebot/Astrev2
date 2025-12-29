import { redirect } from "@sveltejs/kit"
import { type } from "arktype"
import { cookieName, cookieOptions, createSession } from "$lib/server/auth"
import config from "$lib/server/config"
import formError from "$lib/server/formError"
import { db, type RecordId } from "$lib/server/surreal"
import { arktype, superValidate } from "$lib/server/validate"
import { usernameTest } from "$lib/typeTests"
import accountRegistered from "../accountRegistered"
import userQuery from "./user.surql"

const schema = type({
	username: usernameTest,
	password: "1 <= string <= 6969",
})

export const load = async () => ({
	form: await superValidate(arktype(schema)),
	users: await accountRegistered(),
	descriptions: Object.entries(config.Branding.Descriptions),
})

export const actions: import("./$types").Actions = {}
actions.default = async ({ cookies, request }) => {
	const form = await superValidate(request, arktype(schema))
	if (!form.valid) return formError(form)

	const { username, password } = form.data
	form.data.password = ""

	// 1. SAFE MATRIX QUERY
	// Avoid [[user]] because if SurrealDB returns more than one result set, it crashes.
	const results = await db.query<any[][]>(userQuery, { username })
	
	// Grab the first user found in the first result set
	const user = results[0]?.[0]

	// 2. VERIFY USER & PASSWORD
	// Combined check for security (don't reveal if the user exists or not)
	if (!user || !user.hashedPassword || !Bun.password.verifySync(password, user.hashedPassword)) {
		return formError(
			form,
			["username", "password"],
			[" ", "Incorrect username or password"] 
		)
	}

	// 3. CREATE SESSION
	// We pass user.id to match the RecordId type createSession expects
	const sessionToken = await createSession(user.id)
	cookies.set(cookieName, sessionToken, cookieOptions)

	redirect(302, "/home")
}
