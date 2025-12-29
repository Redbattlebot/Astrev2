package ledger

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/surrealdb/surrealdb.go"
	gonanoid "github.com/matoous/go-nanoid/v2"
)

const idchars = "0123456789abcdefghijklmnopqrstuvwxyz"

func RandId() string {
	id, _ := gonanoid.Generate(idchars, 15)
	return id
}

// --- TYPE DEFINITIONS ---
type (
	User      string
	Currency  uint64
	AssetType string
	AssetId   int
	Asset     string
)

type Assets map[Asset]uint64

const (
	Micro             Currency = 1
	Milli                      = 1e3 * Micro
	Unit                       = 1e6 * Micro
	Stipend                    = 10 * Unit
	BasicallyInfinity          = ^uint64(0) / 2
)

// --- STRUCTS ---
type SentTx struct {
	To, From User
	Amount   Currency
	Note     string
	Returns  Assets
}
type Tx struct {
	SentTx
	Time uint64
	Id   string `json:"id,omitempty"`
}

type SentMint struct {
	To     User
	Amount Currency
	Note   string
}
type Mint struct {
	SentMint
	Time uint64
	Id   string `json:"id,omitempty"`
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
	Id   string `json:"id,omitempty"`
}

// --- ECONOMY ENGINE ---
type Economy struct {
	db           *surrealdb.DB
	balances     map[User]Currency
	inventories  map[User]Assets
	prevStipends map[User]uint64
}

func (c Currency) Readable() string {
	return fmt.Sprintf("%d.%06d unit", c/Unit, c%Unit)
}

func NewEconomy(db *surrealdb.DB) (e *Economy, err error) {
	e = &Economy{
		db:           db,
		balances:     make(map[User]Currency),
		inventories:  make(map[User]Assets),
		prevStipends: make(map[User]uint64),
	}
	err = e.loadFromCloud()
	return
}

func (e *Economy) loadFromCloud() error {
	// The driver returns *[]map[string]any. We use map[string]any so it is indexable.
	data, err := surrealdb.Select[map[string]any](context.Background(), e.db, "ledger")
	if err != nil {
		return err
	}

	if data == nil {
		return nil
	}

	// We must dereference the pointer (*data) to loop over the slice
	for _, event := range *data {
		amountRaw, _ := event["Amount"].(float64)
		amount := Currency(amountRaw)

		if to, ok := event["To"].(string); ok && event["From"] != nil {
			from := event["From"].(string)
			e.balances[User(from)] -= amount
			e.balances[User(to)] += amount
		} else if to, ok := event["To"].(string); ok {
			e.balances[User(to)] += amount
			if event["Note"] == "Stipend" {
				timeRaw, _ := event["Time"].(float64)
				e.prevStipends[User(to)] = uint64(timeRaw)
			}
		} else if from, ok := event["From"].(string); ok {
			e.balances[User(from)] -= amount
		}
	}
	return nil
}

// --- CORE METHODS ---
func (e *Economy) Transact(sent SentTx) error {
	if err := e.validateTx(sent); err != nil { return err }
	tx := Tx{sent, uint64(time.Now().UnixMilli()), ""}
	if _, err := surrealdb.Create[Tx](context.Background(), e.db, "ledger", tx); err != nil { return err }
	e.loadTx(tx)
	return nil
}

func (e *Economy) Mint(sent SentMint) error {
	if err := e.validateMint(sent); err != nil { return err }
	mint := Mint{sent, uint64(time.Now().UnixMilli()), ""}
	if _, err := surrealdb.Create[Mint](context.Background(), e.db, "ledger", mint); err != nil { return err }
	e.loadMint(mint)
	return nil
}

func (e *Economy) Burn(sent SentBurn) error {
	if err := e.validateBurn(sent); err != nil { return err }
	burn := Burn{sent, uint64(time.Now().UnixMilli()), ""}
	if _, err := surrealdb.Create[Burn](context.Background(), e.db, "ledger", burn); err != nil { return err }
	e.loadBurn(burn)
	return nil
}

// --- VALIDATION & HELPERS ---
func (e *Economy) validateTx(sent SentTx) error {
	if sent.Amount == 0 { return errors.New("must have amount") }
	if sent.From == "" || sent.To == "" { return errors.New("missing sender or receiver") }
	if total := sent.Amount; total > e.balances[sent.From] {
		return fmt.Errorf("insufficient balance: %s required", total.Readable())
	}
	return nil
}

func (e *Economy) validateMint(sent SentMint) error {
	if sent.Amount == 0 { return errors.New("mint must have amount") }
	return nil
}

func (e *Economy) validateBurn(sent SentBurn) error {
	if sent.Amount == 0 { return errors.New("burn must have amount") }
	if sent.Amount > e.balances[sent.From] { return errors.New("insufficient balance to burn") }
	return nil
}

func (e *Economy) loadTx(tx Tx) {
	e.balances[tx.From] -= tx.Amount
	e.balances[tx.To] += tx.Amount
}

func (e *Economy) loadMint(mint Mint) {
	e.balances[mint.To] += mint.Amount
	if mint.Note == "Stipend" { e.prevStipends[mint.To] = mint.Time }
}

func (e *Economy) loadBurn(burn Burn) {
	e.balances[burn.From] -= burn.Amount
}

func (e *Economy) GetBalance(u User) Currency { return e.balances[u] }
func (e *Economy) GetInventory(u User) Assets { return e.inventories[u] }
func (e *Economy) GetPrevStipend(u User) uint64 { return e.prevStipends[u] }
func (e *Economy) Stipend(to User) error {
	return e.Mint(SentMint{to, Currency(Stipend), "Stipend"})
}

func (e *Economy) LastNTransactions(validate func(tx map[string]any) bool, n int) ([]map[string]any, error) {
	// Query returns *[]QueryResult[[]map[string]any]
	raw, err := surrealdb.Query[[]map[string]any](context.Background(), e.db, "SELECT * FROM ledger ORDER BY Time DESC LIMIT $n", map[string]any{"n": n})
	if err != nil { return nil, err }
	
	// Dereference the pointer, check that it's not nil, and grab the first statement's Result
	if raw != nil && len(*raw) > 0 {
		return (*raw)[0].Result, nil
	}
	
	return []map[string]any{}, nil
}
