package ledger_test

import (
	"fmt"
	"os"
	"testing"

	"github.com/surrealdb/surrealdb.go"
	. "Economy/ledger"
)

type EconomyTest struct {
	Economy *Economy
	t       *testing.T
}

// Helper methods remain the same as they check the local cache
func (et *EconomyTest) ExpectBalance(u User, expected Currency) {
	if balance := et.Economy.GetBalance(u); balance != expected {
		et.t.Fatalf("Expected balance for user %s to be %d, got %d", u, expected, balance)
	}
}

func (et *EconomyTest) ExpectInventoryQuantity(u User, asset Asset, expected uint64) {
	inventory := et.Economy.GetInventory(u)
	if quantity := inventory[asset]; quantity != expected {
		et.t.Fatalf("Expected inventory for user %s to contain asset %s with quantity %d, got %d", u, asset, expected, quantity)
	}
}

func (et *EconomyTest) ExpectInventoryInfinite(u User, asset Asset) {
	inventory := et.Economy.GetInventory(u)
	if quantity, ok := inventory[asset]; !ok || quantity < BasicallyInfinity {
		et.t.Fatalf("Expected inventory for user %s to contain asset %s with quantity Infinity, got %d", u, asset, quantity)
	}
}

// setupTestDB connects to a temporary namespace so you don't mess up your real data
func setupTestDB(t *testing.T) *surrealdb.DB {
	dbURL := os.Getenv("TEST_DB_URL")
	if dbURL == "" {
		dbURL = "ws://localhost:8000/rpc" // Default for local docker testing
	}

	db, err := surrealdb.New(dbURL)
	if err != nil {
		t.Skip("Skipping test: SurrealDB not running locally. Start it with 'surreal start --user root --pass root'")
	}

	if _, err = db.Signin(map[string]interface{}{
		"user": "root",
		"pass": "root",
	}); err != nil {
		t.Fatalf("Test Login failed: %v", err)
	}

	// Use a unique namespace for this test run to avoid conflicts
	testNS := fmt.Sprintf("test_%d", RandAssetId())
	if _, err = db.Use(testNS, "test_db"); err != nil {
		t.Fatalf("Test Use failed: %v", err)
	}

	return db
}

func TestEconomy(t *testing.T) {
	db := setupTestDB(t)
	// We don't defer db.Close() because we want to reopen it to test persistence
	
	e, err := NewEconomy(db)
	if err != nil {
		t.Fatalf("Failed to create economy: %v", err)
	}

	et := &EconomyTest{e, t}
	u1 := User(RandId())

	// 1. Test Mint
	if err = e.Mint(SentMint{
		To:     u1,
		Amount: 50 * Unit,
		Note:   "Minting test points",
	}); err != nil {
		t.Fatal(err)
	}
	et.ExpectBalance(u1, 50*Unit)

	u2 := User(RandId())

	// 2. Test Transaction
	if err = e.Transact(SentTx{
		From:   u1,
		To:     u2,
		Amount: 25 * Unit,
		Note:   "Transfer",
	}); err != nil {
		t.Fatal(err)
	}
	et.ExpectBalance(u1, 25*Unit)
	et.ExpectBalance(u2, 25*Unit)

	// 3. Test Persistence (The most important part of Cloud)
	// We create a NEW economy instance pointing to the SAME database
	e2, err := NewEconomy(db)
	if err != nil {
		t.Fatalf("Failed to reload economy from cloud: %v", err)
	}
	
	et2 := &EconomyTest{e2, t}
	// It should have pulled the balances back from the 'ledger' table
	et2.ExpectBalance(u1, 25*Unit)
	et2.ExpectBalance(u2, 25*Unit)
	
	e2.Stats()
}
