package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name          string             `bson:"name" json:"name"`
	Email         string             `bson:"email" json:"email"`
	PasswordHash  string             `bson:"password" json:"-"`
	WalletAddress string             `bson:"walletAddress" json:"walletAddress"`
	Role          string             `bson:"role" json:"role"`
	CreatedAt     time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt     time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

type PublicUser struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Email         string `json:"email"`
	WalletAddress string `json:"walletAddress,omitempty"`
	Role          string `json:"role,omitempty"`
}

func (u User) ToPublic(includeWallet bool) PublicUser {
	pu := PublicUser{ID: u.ID.Hex(), Name: u.Name, Email: u.Email, Role: u.Role}
	if includeWallet {
		pu.WalletAddress = u.WalletAddress
	}
	return pu
}
