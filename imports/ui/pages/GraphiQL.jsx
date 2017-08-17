import React from 'react';
import GraphiQL from 'graphiql';
import { createLiveQueryClient } from 'meteor/graphql-live-query';
import 'graphiql/graphiql.css';

function createFetcher(client) {
  return function({ query }) {
    return {
      subscribe(next) {
        if (typeof next === 'object')
          next = next.next;

        client.query(query, null, data => next({ data }));

        return {
          unsubscribe() {
            console.warn('unsubscribe() is not implemented yet');
          },
        };
      },
    };
  }
}

export default class GraphiQLWrapper extends React.Component {
  constructor(props) {
    super(props);

    this.state = { client: null };
  }

  componentDidMount() {
    createLiveQueryClient(client => this.setState({
      client,
    }));
  }
  render() {
    const { client } = this.state;

    if (! client)
      return <b>Loading</b>;
    
    return <GraphiQL fetcher={createFetcher(client)} />;
  }
}