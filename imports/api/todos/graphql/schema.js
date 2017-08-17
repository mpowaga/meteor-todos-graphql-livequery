import List from '/imports/api/lists/graphql/schema';

const Todo = `
  type Todo {
    _id: String!
    # list: List!
    text: String!
    createdAt: String!
    checked: Boolean!
  }
`;

export default [Todo, ...List];