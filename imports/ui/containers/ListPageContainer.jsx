import React from 'react';
import { Meteor } from 'meteor/meteor';
import { Lists } from '../../api/lists/lists.js';
import ListPage from '../pages/ListPage.jsx';
import { getLiveQueryClient } from 'meteor/graphql-live-query';

const QUERY = `
  query ($id: String!) {
    list(id: $id) {
      _id
      name
      incompleteCount
      todos {
        _id
        text
        checked
        createdAt
      }
    }
  }
`

class ListPageContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
    };
  }

  componentDidMount() {
    const { params } = this.props;

    getLiveQueryClient(client => {
      client.query(QUERY, { id: params.id }, (data) =>
        this.setState({ loading: false, data }));
    });
  }

  render() {
    const { loading, data } = this.state;

    if (loading) {
      return null;
    }

    const list = data.list[0];
    const listExists = !!list;
    const todos = listExists ? list.todos : [];

    return <ListPage
      {...this.props}
      loading={loading}
      list={list}
      listExists={listExists}
      todos={todos}
    />;
  }
}

export default ListPageContainer;
