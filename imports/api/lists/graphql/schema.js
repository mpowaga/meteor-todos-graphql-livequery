import Todo from '/imports/api/todos/graphql/schema';

const List = `
  type List {
    _id: String!
    name: String!
    incompleteCount: Int!
    userId: String!
    todos: [Todo]
  }
`;

export default [List, ...Todo];