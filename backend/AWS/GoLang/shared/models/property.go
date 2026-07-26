package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PropertyAddress struct {
	Street  string `bson:"street" json:"street"`
	City    string `bson:"city" json:"city"`
	State   string `bson:"state" json:"state"`
	ZipCode string `bson:"zipCode" json:"zipCode"`
	Country string `bson:"country" json:"country"`
}

type PropertyImage struct {
	URL    string `bson:"url" json:"url"`
	IsMain bool   `bson:"isMain" json:"isMain"`
}

type PropertyFeature struct {
	Name  string `bson:"name" json:"name"`
	Value string `bson:"value" json:"value"`
	Icon  string `bson:"icon" json:"icon"`
}

type CurrentOwner struct {
	User            primitive.ObjectID `bson:"user" json:"user"`
	Shares          int                `bson:"shares" json:"shares"`
	PurchaseDate    time.Time          `bson:"purchaseDate" json:"purchaseDate"`
	TransactionHash string             `bson:"transactionHash" json:"transactionHash"`
}

type Property struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Title           string             `bson:"title" json:"title"`
	Description     string             `bson:"description" json:"description"`
	Address         PropertyAddress    `bson:"address" json:"address"`
	Price           float64            `bson:"price" json:"price"`
	PriceCurrency   string             `bson:"priceCurrency" json:"priceCurrency"`
	TotalShares     int                `bson:"totalShares" json:"totalShares"`
	AvailableShares int                `bson:"availableShares" json:"availableShares"`
	SharePrice      float64            `bson:"sharePrice" json:"sharePrice"`
	Images          []PropertyImage    `bson:"images" json:"images"`
	Features        []PropertyFeature  `bson:"features" json:"features"`
	PropertyType    string             `bson:"propertyType" json:"propertyType"`
	Size            float64            `bson:"size" json:"size"`
	Bedrooms        int                `bson:"bedrooms" json:"bedrooms"`
	Bathrooms       int                `bson:"bathrooms" json:"bathrooms"`
	YearBuilt       int                `bson:"yearBuilt" json:"yearBuilt"`
	TokenID         *int               `bson:"tokenId,omitempty" json:"tokenId,omitempty"`
	ContractAddress *string            `bson:"contractAddress,omitempty" json:"contractAddress,omitempty"`
	FractionalToken *string            `bson:"fractionalToken,omitempty" json:"fractionalToken,omitempty"`
	IsListed        bool               `bson:"isListed" json:"isListed"`
	Lister          primitive.ObjectID `bson:"lister" json:"lister"`
	CurrentOwners   []CurrentOwner     `bson:"currentOwners" json:"currentOwners"`
	CreatedAt       time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt       time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}
