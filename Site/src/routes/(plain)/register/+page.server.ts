import { redirect } from "@sveltejs/kit"
import { type } from "arktype"
import { cookieName, cookieOptions, createSession } from "$lib/server/auth"
import config from "$lib/server/config"
import formError from "$lib/server/formError"
import requestRender from "$lib/server/requestRender"
import { db, findWhere, Record, type RecordId } from "$lib/server/surreal"
import { arktype, superValidate } from "$lib/server/validate"
import { usernameTest } from "$lib/typeTests"
import accountRegistered from "../accountRegistered"
import createUserQuery from "./createUser.surql"
import regkeyCheckQuery from "./regkeyCheck.surql"

const schemaInitial = type({
	username: usernameTest,
	password: "1 <= string <= 6969",
	cpassword: "1 <= string <= 6969",
})

const schema = type({
	username: usernameTest,
	...(config.Registration.Emails && {
		email: type(/^.+@.+$/).configure({
			problem: "must be a valid RFC-5321 email address",
		}),
	}),
	password: "16 <= string <= 6969",
	cpassword: "16 <= string <= 6969",
	...(config.Registration.Keys.Enabled && {
		regkey: "1 <= string <= 6969",
	}),
})

const prefix = config.Registration.Keys.Prefix
const prefixRegex = new RegExp(`^${prefix}(.+)$`)

export const load = async () => ({
	form: await superValidate(arktype(schema)),
	users: await accountRegistered(),
	regKeysEnabled: config.Registration.Keys.Enabled,
	emailsEnabled: config.Registration.Emails,
	prefix,
})

export const actions: import("./$types").Actions = {}

// --- STANDARD REGISTRATION ---
actions.register = async ({ fetch: f, cookies, request }) => {
	const form = await superValidate(request, arktype(schema))
	if (!form.valid) return formError(form)

	const { username, password, cpassword, email } = form.data
	form.data.password = form.data.cpassword = ""

	if (cpassword !== password)
		return formError(form, ["password", "cpassword"], [" ", "Passwords do not match"])

	const userCheck = await findWhere("user", "username = $username", { username })
	if (userCheck) return formError(form, ["username"], ["This username is already in use"])

	if (config.Registration.Emails) {
		const emailCheck = await findWhere("user", "email = $email", { email })
		if (emailCheck) return formError(form, ["email"], ["This email is already in use"])
	}

	let key: RecordId<"regKey"> | undefined
	if (config.Registration.Keys.Enabled) {
		const { regkey } = form.data
		const matched = regkey.match(prefixRegex)
		if (!matched) return formError(form, ["regkey"], ["Registration key is invalid"])

		key = Record("regKey", matched[1])
		const results = await db.query<any[]>(regkeyCheckQuery, { key })
		// Find the result that contains the regKey data
		const regkeyCheck = results.find(r => r && r.usesLeft !== undefined)

		if (!regkeyCheck) return formError(form, ["regkey"], ["Registration key is invalid"])
		if (regkeyCheck.usesLeft < 1) return formError(form, ["regkey"], ["This registration key has ran out of uses"])
	}

	// EXECUTE CREATION
	const results = await db.query<any[]>(createUserQuery, {
		admin: false,
		username,
		email: email || "",
		hashedPassword: Bun.password.hashSync(password),
		permissionLevel: 1,
		bodyColours: config.DefaultBodyColors,
		key,
	})

	// FIXED: Dynamically find the user object in the results array
	const user = results.find(r => r && (r.id || (Array.isArray(r) && r[0]?.id)));
	const actualUser = Array.isArray(user) ? user[0] : user;

	if (!actualUser) return formError(form, ["username"], ["Database failed to create user record."])

	try {
		const userId = actualUser.id ? actualUser.id.toString() : actualUser.toString()
		await requestRender(f, "Avatar", userId, username)
	} catch (e) {
		console.warn("Avatar render failed, but user was created.")
	}

	cookies.set(cookieName, await createSession(actualUser), cookieOptions)
	redirect(302, "/home")
}

// --- INITIAL ACCOUNT CREATION ---
actions.initialAccount = async ({ fetch: f, cookies, request }) => {
	const form = await superValidate(request, arktype(schemaInitial))
	if (!form.valid) return formError(form)

	const { username, password, cpassword } = form.data
	form.data.password = form.data.cpassword = ""

	if (cpassword !== password)
		return formError(form, ["password", "cpassword"], [" ", "The specified passwords do not match"])
	
	if (await accountRegistered())
		return formError(form, ["username"], ["There's already an account registered"])

	// EXECUTE CREATION
	const results = await db.query<any[]>(createUserQuery, {
		admin: true,
		username,
		email: "",
		hashedPassword: Bun.password.hashSync(password),
		permissionLevel: 5,
		bodyColours: config.DefaultBodyColors,
	})

	// FIXED: Dynamically find the user object in the results array
	// Based on your logs, it was at index [2], but this find() covers all bases
	const user = results.find(r => r && (r.id || (Array.isArray(r) && r[0]?.id)));
	const actualUser = Array.isArray(user) ? user[0] : user;

	if (!actualUser) {
		console.error("Initial account creation failed. Results:", results)
		return formError(form, ["username"], ["Database error: User not returned after creation."])
	}

	try {
		const userId = actualUser.id ? actualUser.id.toString() : actualUser.toString()
		await requestRender(f, "Avatar", userId, username)
	} catch (e) {
		console.warn("Avatar render failed.")
	}

	// Create session and set cookie
	const sessionToken = await createSession(actualUser)
	cookies.set(cookieName, sessionToken, cookieOptions)

	redirect(302, "/home")
}
