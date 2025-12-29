package main

import (
	"context" // Added
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/surrealdb/surrealdb.go"
	c "github.com/TwiN/go-color"

	. "Economy/ledger"
)

const stipendTime = 12 * 60 * 60 * 1000

type EconomyServer struct {
	*Economy
}

func toReadable(cur Currency) string {
	return fmt.Sprintf("%d.%06d unit", cur/Unit, cur%Unit)
}

// --- ALL YOUR IMPORTANT ROUTES (KEPT) ---

func (e *EconomyServer) currentStipendRoute(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, Stipend)
}

func (e *EconomyServer) balanceRoute(w http.ResponseWriter, r *http.Request) {
	var u User
	if _, err := fmt.Sscanf(r.PathValue("id"), "%s", &u); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	fmt.Fprint(w, e.GetBalance(u))
}

func (e *EconomyServer) adminTransactionsRoute(w http.ResponseWriter, r *http.Request) {
	transactions, err := e.LastNTransactions(func(tx map[string]any) bool { return true }, 100)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(transactions)
}

func (e *EconomyServer) transactionsRoute(w http.ResponseWriter, r *http.Request) {
	id := User(r.PathValue("id"))
	transactions, err := e.LastNTransactions(func(tx map[string]any) bool {
		return tx["From"] != nil && User(tx["From"].(string)) == id || tx["To"] != nil && User(tx["To"].(string)) == id
	}, 100)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(transactions)
}

func (e *EconomyServer) transactRoute(w http.ResponseWriter, r *http.Request) {
	var stx SentTx
	if err := json.NewDecoder(r.Body).Decode(&stx); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := e.Transact(stx); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	fmt.Println(c.InGreen(fmt.Sprintf("Transaction successful  %s -[%s]-> %s", stx.From, toReadable(stx.Amount), stx.To)))
}

func (e *EconomyServer) mintRoute(w http.ResponseWriter, r *http.Request) {
	var sm SentMint
	if err := json.NewDecoder(r.Body).Decode(&sm); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := e.Mint(sm); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	fmt.Println(c.InGreen(fmt.Sprintf("Mint successful          %s <-[%s]-", sm.To, toReadable(sm.Amount))))
}

func (e *EconomyServer) burnRoute(w http.ResponseWriter, r *http.Request) {
	var sb SentBurn
	if err := json.NewDecoder(r.Body).Decode(&sb); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := e.Burn(sb); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	fmt.Println(c.InGreen(fmt.Sprintf("Burn successful          %s -[%s]->", sb.From, toReadable(sb.Amount))))
}

func (e *EconomyServer) stipendRoute(w http.ResponseWriter, r *http.Request) {
	var to User
	if _, err := fmt.Sscanf(r.PathValue("id"), "%s", &to); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if e.GetPrevStipend(to)+stipendTime > uint64(time.Now().UnixMilli()) {
		http.Error(w, "Next stipend not available yet", http.StatusBadRequest)
		return
	}
	if err := e.Stipend(to); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	fmt.Println(c.InGreen(fmt.Sprintf("Stipend successful      %s", to)))
}

func main() {
	fmt.Println(c.InYellow("🚀 Connecting to SurrealDB Cloud..."))

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "https://rosilo-06dmf6lsidp67225aee6c67su4.aws-usw2.surreal.cloud/rpc"
	}

	db, err := surrealdb.New(dbURL)
	if err != nil {
		fmt.Printf(c.InRed("❌ Connection error: %v\n"), err)
		os.Exit(1)
	}

	// FIX 1: Use SignIn (capitalized) and context.Background()
	_, err = db.SignIn(context.Background(), map[string]interface{}{
		"user": os.Getenv("SURREAL_USER"),
		"pass": os.Getenv("SURREAL_PASS"),
	})
	if err != nil {
		fmt.Printf(c.InRed("❌ Login failed: %v\n"), err)
		os.Exit(1)
	}

	// FIX 2: Use context.Background() and capture only 1 return value (error)
	if err = db.Use(context.Background(), os.Getenv("SURREAL_NS"), os.Getenv("SURREAL_DB")); err != nil {
		fmt.Printf(c.InRed("❌ Namespace/DB error: %v\n"), err)
		os.Exit(1)
	}

	e, err := NewEconomy(db) 
	if err != nil {
		fmt.Printf(c.InRed("❌ Economy Init failed: %v\n"), err)
		os.Exit(1)
	}

	es := EconomyServer{Economy: e}
	http.HandleFunc("GET /currentStipend", es.currentStipendRoute)
	http.HandleFunc("GET /balance/{id}", es.balanceRoute)
	http.HandleFunc("GET /transactions", es.adminTransactionsRoute)
	http.HandleFunc("GET /transactions/{id}", es.transactionsRoute)
	http.HandleFunc("POST /transact", es.transactRoute)
	http.HandleFunc("POST /mint", es.mintRoute)
	http.HandleFunc("POST /burn", es.burnRoute)
	http.HandleFunc("POST /stipend/{id}", es.stipendRoute)

	fmt.Println(c.InGreen("~ Economy service is up on port 2009 ~"))
	http.ListenAndServe(":2009", nil)
}
