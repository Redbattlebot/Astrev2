package ledger

import (
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/surrealdb/surrealdb.go"
	gonanoid "github.com/matoous/go-nanoid/v2"
)

const idchars = "0123456789abcdefghijklmnopqrstuvwxyz"

// --- IMPORTANT TYPES & CONSTANTS (KEPT) ---

type (
	User      string
	Currency  uint64
	AssetType string
	AssetId   int
	Asset     string
)

const (
	Micro Currency = 1
	Milli          = 1e3 * Micro
	Unit           = 1e6 * Micro 
	Stipend        = 10 * Unit
	BasicallyInfinity = ^uint64(0) / 2
)

type Assets map[Asset]uint64

type SentTx struct {
	To, From User
	Amount   Currency
	Note     string
	Returns  Assets
}
type Tx struct {
	SentTx
	Time uint64
	Id   string
}

type SentMint struct {
	To     User
	Amount Currency
	Note   string
}
type Mint struct {
	SentMint
	Time uint64
	Id   string
}

type SentBurn struct {
	From       User
	Amount     Currency
	Note, Link string
	Returns    Assets
}
type Burn struct {
	SentBurn
	Time uint64
	Id   string
}

// --- ECONOMY ENGINE (UPDATED FOR CLOUD) ---

type Economy struct {
	db           *surrealdb.DB
	balances     map[User]Currency
	inventories  map[User]Assets
	prevStipends map[User]uint64
}

func (c Currency) Readable() string {
	return fmt.Sprintf("%d.%06d unit", c/Unit, c%Unit)
}

func RandId() string {
	id, _ := gonanoid.Generate(idchars, 15)
	return id
}

// NewEconomy: The new constructor that connects to the cloud
func NewEconomy(db *surrealdb.DB) (e *Economy, err error) {
	e = &Economy{
		db:           db,
		balances:     make(map[User]Currency),
		inventories:  make(map[User]Assets),
		prevStipends: make(map[User]uint64),
	}

	// This replaces 'loadData' from your file system logic
	if err = e.syncWithCloud(); err != nil {
		return nil, fmt.Errorf("failed to sync ledger from cloud: %w", err)
	}

	return
}

// syncWithCloud: Replays the cloud ledger to build current balances
func (e *Economy) syncWithCloud() error {
	// Query SurrealDB for all ledger entries
	data, err := e.db.Select("ledger")
	if err != nil {
		return err
	}

	var events []map[string]interface{}
	if err := surrealdb.Unmarshal(data, &events); err != nil {
		return err
	}

	for _, event := range events {
		// Identify the type of entry and apply logic (The "Important Stuff")
		if _, ok := event["To"]; ok && event["From"] != nil {
			// It's a Transaction
			e.balances[User(event["From"].(string))] -= Currency(event["Amount"].(float64))
			e.balances[User(event["To"].(string))] += Currency(event["Amount"].(float64))
		} else if _, ok := event["To"]; ok {
			// It's a Mint
			e.balances[User(event["To"].(string))] += Currency(event["Amount"].(float64))
			if event["Note"] == "Stipend" {
				e.prevStipends[User(event["To"].(string))] = uint64(event["Time"].(float64))
			}
		} else if _, ok := event["From"]; ok {
			// It's a Burn
			e.balances[User(event["From"].(string))] -= Currency(event["Amount"].(float64))
		}
	}
	return nil
}

// --- CORE LOGIC METHODS (KEPT & UPDATED) ---

func (e *Economy) Transact(sent SentTx) error {
	if err := e.validateTx(sent); err != nil {
		return err
	}
	tx := Tx{sent, uint64(time.Now().UnixMilli()), RandId()}
	
	// Create record in SurrealDB 'ledger' table
	if _, err := e.db.Create("ledger", tx); err != nil {
		return err
	}
	
	e.loadTx(tx) 
	return nil
}

func (e *Economy) Mint(sent SentMint) error {
	if err := e.validateMint(sent); err != nil {
		return err
	}
	mint := Mint{sent, uint64(time.Now().UnixMilli()), RandId()}
	
	if _, err := e.db.Create("ledger", mint); err != nil {
		return err
	}
	
	e.loadMint(mint)
	return nil
}

func (e *Economy) Burn(sent SentBurn) error {
	if err := e.validateBurn(sent); err != nil {
		return err
	}
	burn := Burn{sent, uint64(time.Now().UnixMilli()), RandId()}
	
	if _, err := e.db.Create("ledger", burn); err != nil {
		return err
	}
	
	e.loadBurn(burn)
	return nil
}

// ... Keep your loadTx, loadMint, loadBurn, and all Validate functions ...
// ... Keep GetBalance, GetUserCount, CCU, and Stats functions ...

func (e *Economy) Stipend(to User) error {
	return e.Mint(SentMint{to, Currency(Stipend), "Stipend"})
}
