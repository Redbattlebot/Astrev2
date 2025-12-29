async function reconnect() {
	for (let attempt = 0; ; attempt++)
		try {
			await db.close() 
			console.log("RUNNING HARDCODED AUTH TEST...") // Debug log
            
			await db.connect(new URL("wss://rosilo-06dmf6lsidp67225aee6c67su4.aws-usw2.surreal.cloud/rpc"), {
				namespace: "YOUR_EXACT_NAMESPACE", // Change this to your exact name (case sensitive!)
				database: "YOUR_EXACT_DATABASE",  // Change this to your exact name
				auth: {
					username: "root", 
					password: "YOUR_ACTUAL_CLOUD_ROOT_PASSWORD", // Paste the password here
				},
			})
            
			console.log("✅ HARDCODED TEST SUCCESS! Version:", await version())
			break
		} catch (err) {
			const e = err as Error
			console.error("❌ Hardcoded test failed:", e.message)
			if (attempt === 2) break; // Don't loop forever if it's wrong
			await new Promise(resolve => setTimeout(resolve, 2000))
		}
}
