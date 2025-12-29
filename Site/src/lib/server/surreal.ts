async function reconnect() {
	for (let attempt = 1; ; attempt++) {
		try {
			await db.close();
			console.log(`🚀 Attempt ${attempt}: Using Explicit Root Authentication...`);
			
			await db.connect("wss://rosilo-06dmf6lsidp67225aee6c67su4.aws-usw2.surreal.cloud/rpc");
			
			// We MUST provide 'access: "root"' to tell the engine 
            // that 'rosilo_owner' is a System-level user.
			await db.signin({
				username: "rosilo_owner",
				password: "Protogenslol1",
				access: "root",
                // Sometimes the Cloud IAM requires these to be undefined 
                // for a Root login to prevent 'Target' confusion
                namespace: undefined,
                database: undefined
			} as any);

			// After logging into the System, we "USE" the specific database
			await db.use({ ns: "Rosilo", db: "rosilo" });
			
			console.log("✅ AUTH SUCCESS! Root session established.");
			break;
		} catch (err) {
			const e = err as Error;
			console.error(`❌ Connection failed: ${e.message}`);
			
            // SECONDARY FALLBACK: 
            // If Root access fails, try logging in directly to the Namespace
			if (attempt === 1) {
				try {
					console.log("🔄 Retrying with Namespace Scope...");
					await db.signin({
						username: "rosilo_owner",
						password: "YOUR_PASSWORD_HERE",
						namespace: "Rosilo",
						database: "rosilo",
						access: "namespace" 
					} as any);
					console.log("✅ AUTH SUCCESS (Namespace Level)");
					break;
				} catch (inner) { console.error("❌ Namespace fallback failed."); }
			}

			if (attempt >= 3) break;
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
	}
}
