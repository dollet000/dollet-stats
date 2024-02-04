import { ethers, BigNumber } from "ethers";
import axios from "axios";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client/core";
import * as dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file

const ETHEREUM_MAINNET = "ethereum";
const ARBITRUM_MAINNET = "arbitrum";

const txExplorers = {
  ethereum: "etherscan",
  arbitrum: "arbiscan",
};

async function main() {
  const ethereumRpc = process.env.ETHEREUM_MAINNET_RPC;
  const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
  const arbitrumRpc = process.env.ARBITRUM_MAINNET_RPC;
  const arbiscanApiKey = process.env.ARBISCAN_API_KEY;

  // Request for Arbitrum mainnet Strategy#1
  const graphUrlStrategy1 = process.env.GRAPH_URL_STRATEGY_1;
  await getValues(
    arbitrumRpc,
    ARBITRUM_MAINNET,
    graphUrlStrategy1,
    arbiscanApiKey,
    "Strategy1"
  );

  // Request for Ethereum mainnet Strategy#2
  const graphUrlStrategy2 = process.env.GRAPH_URL_STRATEGY_2;
  await getValues(
    ethereumRpc,
    ETHEREUM_MAINNET,
    graphUrlStrategy2,
    etherscanApiKey,
    "Strategy2"
  );

  // Request for Ethereum mainnet Strategy#3
  const graphUrlStrategy3 = process.env.GRAPH_URL_STRATEGY_3;
  await getValues(
    ethereumRpc,
    ETHEREUM_MAINNET,
    graphUrlStrategy3,
    etherscanApiKey,
    "Strategy3"
  );

  // Request for Ethereum mainnet Strategy#4
  const graphUrlStrategy4 = process.env.GRAPH_URL_STRATEGY_4;
  await getValues(
    ethereumRpc,
    ETHEREUM_MAINNET,
    graphUrlStrategy4,
    etherscanApiKey,
    "Strategy4"
  );

  // Request for Ethereum mainnet Strategy#5
  const graphUrlStrategy5 = process.env.GRAPH_URL_STRATEGY_5;
  await getValues(
    ethereumRpc,
    ETHEREUM_MAINNET,
    graphUrlStrategy5,
    etherscanApiKey,
    "Strategy5"
  );

  // Request for Arbitrum mainnet Strategy#6
  const graphUrlStrategy6 = process.env.GRAPH_URL_STRATEGY_6;
  await getValues(
    arbitrumRpc,
    ARBITRUM_MAINNET,
    graphUrlStrategy6,
    arbiscanApiKey,
    "Strategy6"
  );

  // Request for Arbitrum mainnet Strategy#7
  const graphUrlStrategy7 = process.env.GRAPH_URL_STRATEGY_7;
  await getValues(
    ethereumRpc,
    ETHEREUM_MAINNET,
    graphUrlStrategy7,
    etherscanApiKey,
    "Strategy7"
  );
}

async function getValues(
  networkRpc: string,
  networkName: string,
  graphUrl: string,
  etherscanApiKey: string,
  name: string
) {
  const provider = new ethers.providers.JsonRpcProvider(networkRpc);
  // Get the current block number
  const currentBlockNumber = await provider.getBlockNumber();
  // Getting the timestamp for one week ago
  // TODO: replace for 604800 seconds = one week or any period.
  const timePeriod = 18995305; // 604800
  const timestamp = Math.floor(Date.now() / 1000) - timePeriod; // Current timestamp - time
  const response = await axios.get(
    `https://api.${txExplorers[networkName]}.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${etherscanApiKey}`
  );
  const blockInThePast = response.data.result;
  if (blockInThePast.toString().includes("Invalid"))
    throw Error("Invalid API KEY");
  console.log("blockInThePast:", blockInThePast);

  const tokensQuery = `
    query getUsers($first: Int!, $skip: Int!) {
        users(first: $first, skip: $skip) {
            id
            transactions(
                where: { blockNumber_gte: ${blockInThePast}, blockNumber_lte: ${currentBlockNumber}}
            ){
              id
              txCost
            }
        }
    }
  `;

  const client = new ApolloClient({
    uri: graphUrl,
    cache: new InMemoryCache(),
  });

  const cachedUsers = [];
  let sumTxCost = BigNumber.from(0);
  let amountUsers = 0;
  let amountTransactions = 0;

  const paginationSize = 100;
  let shouldContinue = true;
  let offset = 0;
  while (shouldContinue) {
    try {
      const response = await client.query({
        query: gql(tokensQuery),
        variables: {
          first: paginationSize,
          skip: offset,
        },
      });

      const users = response.data.users;
      if (users.length < paginationSize) shouldContinue = false;
      offset += paginationSize;

      for (let i = 0; i < users.length; i++) {
        if (users[i].transactions.length == 0) continue;
        amountUsers++;
        amountTransactions += users[i].transactions.length;
        cachedUsers.push({
          ...users[i],
          transactionCount: users[i].transactions.length,
        });
        for (let j = 0; j < users[i].transactions.length; j++) {
          sumTxCost = sumTxCost.add(
            BigNumber.from(users[i].transactions[j].txCost)
          );
        }
      }
    } catch (error) {
      console.error(`Error fetching page ${offset / paginationSize}:`, error);
    }
  }
  if (amountTransactions == 0) {
    console.log("No results found");
    return {
      name,
      amountTransactions,
      averageTxCost: 0,
      sumTxCost: 0,
      amountUsers: 0,
      txPerUser: cachedUsers,
    };
  }

  // Return these
  const averageTxCost = sumTxCost.div(amountTransactions);
  console.log("name:", name);
  console.log("AmountTransactions:", amountTransactions);
  console.log("AverageTxCost:", averageTxCost.toString());
  console.log("AmountUsers:", amountUsers);
  console.log("SumTxCost:", sumTxCost.toString());
  console.log("Transactions per user", JSON.stringify(cachedUsers, null, 2));
  return {
    name,
    amountTransactions,
    averageTxCost,
    sumTxCost,
    amountUsers,
    txPerUser: cachedUsers,
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
