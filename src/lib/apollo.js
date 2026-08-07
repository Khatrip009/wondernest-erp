import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { supabase } from './supabase'; // your existing client

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_SUPABASE_URL + '/graphql/v1',
});

const authLink = setContext(async (_, { headers }) => {
  // Get the current session from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || '';
  
  return {
    headers: {
      ...headers,
      'apiKey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': token ? `Bearer ${token}` : '',
    },
  };
});

export const client = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      // Optional: customise caching for Relay connections
      InquiryConnection: {
        merge: true, // for pagination
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});