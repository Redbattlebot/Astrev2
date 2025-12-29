// Mercury Economy service - Fully Cloud Version
package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/surrealdb/surrealdb.go"
	c "github.com/TwiN/go-color"

	. "Economy/ledger"
)

type EconomyServer struct {
	*Economy
}

// ... (Keep all your route functions: balanceRoute, transactRoute, etc. exactly as they were)

func main() {
	fmt.Println(c.InYellow("🚀 Connecting to SurrealDB Cloud..."))

	// 1. Get credentials from Render Environment
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		// Fallback for local testing if env is missing
		dbURL = "https://rosilo-06dmf6lsidp67225aee6c67su4.aws-usw2.surreal.cloud/rpc"
	}

	// 2. Initialize the SurrealDB Client
	db, err := surrealdb.New(dbURL)
	if err != nil {
		fmt.Printf(c.InRed("❌ Connection error: %v\n"), err)
		os.Exit(1)
	}

	// 3. Sign in using System User Auth
	_, err = db.Signin(map[string]interface{}{
		"user": os.Getenv("SURREAL_USER"),
		"pass": os.Getenv("SURREAL_PASS"),
	})
	if err != nil {
		fmt.Printf(c.InRed("❌ Login failed (Check SURREAL_USER/PASS): %v\n"), err)
		os.Exit(1)
	}

	// 4. Set Namespace and Database context
	if _, err = db.Use(os.Getenv("SURREAL_NS"), os.Getenv("SURREAL_DB")); err != nil {
		fmt.Printf(c.InRed("❌ Namespace/DB error: %v\n"), err)
		os.Exit(1)
	}

	fmt.Println(c.InGreen("✅ Linked to Rosilo Cloud Database"))

	// 5. Initialize Economy with the Database client instead of a file
	e, err := NewEconomy(db) 
	if err != nil {
		fmt.Printf(c.InRed("❌ Economy Init failed: %v\n"), err)
		os.Exit(1)
	}

	es := EconomyServer{Economy: e}

	// Standard Routes
	http.HandleFunc("GET /currentStipend", es.currentStipendRoute)
	http.HandleFunc("GET /balance/{id}", es.balanceRoute)
	http.HandleFunc("GET /transactions", es.adminTransactionsRoute)
	http.HandleFunc("GET /transactions/{id}", es.transactionsRoute)
	http.HandleFunc("POST /transact", es.transactRoute)
	http.HandleFunc("POST /mint", es.mintRoute)
	http.HandleFunc("POST /burn", es.burnRoute)
	http.HandleFunc("POST /stipend/{id}", es.stipendRoute)

	fmt.Println(c.InGreen("~ Economy service is up on port 2009 ~"))
	if err := http.ListenAndServe(":2009", nil); err != nil {
		fmt.Println(c.InRed("Failed to start server: " + err.Error()))
		os.Exit(1)
	}
}
