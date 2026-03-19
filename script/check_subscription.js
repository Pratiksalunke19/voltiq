
const { SDK } = require('@somnia-chain/reactivity');
const { somniaTestnet } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');
const { createPublicClient, createWalletClient, http } = require('viem');
require('dotenv').config();

async function main() {
  const sdk = new SDK({
    public: createPublicClient({
      chain: somniaTestnet,
      transport: http()
    }),
    wallet: createWalletClient({
    account: privateKeyToAccount(`0x${process.env.PRIVATE_KEY.replace('0x', '')}`),
        chain: somniaTestnet,
        transport: http(),
    })
  });

  console.log('Checking subscriptions...');
  // The SDK might have a way to list subscriptions for the user
  // Let's see if we can find something in the prototype if not obvious
  // Actually let's just try to create one or see available methods
  console.log('Available SDK methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(sdk)));

  // If there's a getter, we'll try to use it
  try {
      if (sdk.getSoliditySubscriptions) {
        const subs = await sdk.getSoliditySubscriptions();
        console.log('Current subscriptions:', subs);
      } else {
        console.log('No getSoliditySubscriptions method found on SDK instance.');
      }
  } catch (err) {
      console.error('Error fetching subscriptions:', err.message);
  }
}

main();
