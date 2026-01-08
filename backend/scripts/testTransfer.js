// testTransfer.js
const Web3 = require("web3");
const FractionalToken = require("../../build/contracts/FractionalToken.json");
require("dotenv").config();

async function testTransfer() {
  // Initialize web3
  const web3 = new Web3(process.env.BLOCKCHAIN_URL || "http://localhost:7545");

  // Get accounts
  const accounts = await web3.eth.getAccounts();
  const [from, to] = accounts;

  // Token contract address
  const tokenAddress = "0xf7ad08Abb0eC9f65Cca25d1972C90f3b769FdeE1";

  // Create contract instance
  const token = new web3.eth.Contract(FractionalToken.abi, tokenAddress);

  try {
    // Check if trading is enabled
    const isTradable = await token.methods.isTradable().call();
    console.log("Is tradable:", isTradable);

    // Get token symbol and decimals
    const symbol = await token.methods.symbol().call();
    const decimals = await token.methods.decimals().call();
    const amount = web3.utils.toWei("1", "ether");

    console.log(`\nTesting transfer of 1 ${symbol} from ${from} to ${to}`);

    // Perform transfer
    const receipt = await token.methods
      .transfer(to, amount)
      .send({ from, gas: 200000 });

    console.log("\n✅ Transfer successful!");
    console.log("Transaction hash:", receipt.transactionHash);

    // Check balances
    const fromBalance = await token.methods.balanceOf(from).call();
    const toBalance = await token.methods.balanceOf(to).call();

    console.log(`\nBalances after transfer:`);
    console.log(
      `From (${from}):`,
      web3.utils.fromWei(fromBalance, "ether"),
      symbol
    );
    console.log(`To (${to}):`, web3.utils.fromWei(toBalance, "ether"), symbol);
  } catch (error) {
    console.error("\n❌ Transfer failed:");
    console.error(error.message);
    console.error("\nFull error object:");
    console.error(JSON.stringify(error, null, 2));
  }
}

testTransfer();
