# Smart Contracts Documentation

This directory contains the smart contracts that power the Real Estate Tokenization Platform. The system is built on the Ethereum blockchain and uses the ERC-721 and ERC-20 token standards.

## Contract Architecture

```
┌─────────────────┐     ┌───────────────────────┐     ┌─────────────────────┐
│  PropertyNFT    │     │  FractionalToken     │     │ FractionalToken     │
│  (ERC-721)      │     │  Factory             │     │ (ERC-20)            │
│                 │     │                       │     │                     │
│  - Mint tokens  │◄───►│  - Create new        │◄───►│ - Represents        │
│  - Manage props │     │    fractional tokens │     │   property shares   │
│  - Track owners │     │  - Track all tokens  │     │ - Enable trading    │
└─────────────────┘     └───────────────────────┘     └─────────────────────┘
```

## Contract Details

### 1. PropertyNFT.sol

**Inherits:** `ERC721URIStorage`, `Ownable`

This contract represents real estate properties as non-fungible tokens (NFTs). Each token corresponds to a unique property.

#### Key Features:

- **Minting**: Create new property NFTs with metadata
- **Ownership Management**: Track property ownership
- **Fractionalization**: Enable properties to be tokenized into fractions
- **Listing**: Manage property listing status for fractional ownership

#### Important Functions:

- `mintProperty()`: Create a new property NFT
- `listForFractionalOwnership()`: List a property for fractional ownership
- `unlistProperty()`: Remove a property from fractional ownership listing

### 2. FractionalToken.sol

**Inherits:** `ERC20`, `Ownable`

This contract represents fractional ownership of a property as ERC-20 tokens.

#### Key Features:

- **Share Management**: Create and manage property shares
- **Trading Controls**: Enable/disable trading of shares
- **Price Management**: Set and update share prices

#### Important Functions:

- `purchaseShares()`: Buy fractional shares of a property
- `enableTrading()`: Allow trading of shares
- `disableTrading()`: Halt trading of shares

### 3. FractionalTokenFactory.sol

**Inherits:** `Ownable`

Factory contract that deploys new instances of FractionalToken for properties.

#### Key Features:

- **Token Deployment**: Create new fractional tokens for properties
- **Registry**: Track all created tokens
- **Access Control**: Restrict token creation to authorized addresses

#### Important Functions:

- `createFractionalToken()`: Deploy a new fractional token for a property
- `getDeployedTokens()`: View all tokens created by the factory

## Deployment

1. Deploy `PropertyNFT` contract
2. Deploy `FractionalTokenFactory` contract
3. Set the factory address in the `PropertyNFT` contract
4. Update the contract addresses in the backend `.env` file

## Security Considerations

- All contracts use OpenZeppelin's battle-tested implementations
- Access control is implemented using OpenZeppelin's `Ownable`
- Reentrancy guards are in place where necessary
- All external calls are validated

## Testing

Run the test suite with:

```bash
npx hardhat test
# or
truffle test
```

## Audits

These contracts should be audited before deployment to mainnet. The current version has not been audited.

## License

MIT
