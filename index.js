const { ApolloServer } = require("apollo-server");
const { MemcachedCache } = require('apollo-server-cache-memcached');
const fetch = require("node-fetch");
const _ = require("lodash");
const { ApolloServerPluginCacheControl } = require('apollo-server-core');
const { InMemoryLRUCache } = require("apollo-server-caching");


// Construct a schema, using GraphQL schema language
const typeDefs = `
  type Query @cacheControl(maxAge: 60) {
    rates(currency: String!): [ExchangeRate] @cacheControl(maxAge: 180)
  }

	type ExchangeRate @cacheControl(maxAge: 180) {
		currency: String
		rate: String
		name: String
	}
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    rates: async (_root, { currency }) => {
      try {
        const results = await fetch(
          `https://api.coinbase.com/v2/exchange-rates?currency=${currency}`
        );
        const exchangeRates = await results.json();

        return _.map(exchangeRates.data.rates, (rate, currency) => ({
          currency,
          rate
        }));
      } catch (e) {
        console.error(e);
      }
    }
  },
  ExchangeRate: {
    name: async ({ currency }) => {
      try {
        const results = await fetch("https://api.coinbase.com/v2/currencies");
        const currencyData = await results.json();

        const currencyInfo = currencyData.data.find(
          c => c.id.toUpperCase() === currency
        );
        return currencyInfo ? currencyInfo.name : null;
      } catch (e) {
        console.error(e);
      }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginCacheControl({ defaultMaxAge: 5 })],
  persistedQueries: {
    cache: new InMemoryLRUCache() 
  },
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
