import { makeExecutableSchema } from 'graphql-tools';
import {
  createLiveQueryServer,
  resolve,
} from 'meteor/graphql-live-query';
import ListSchema from '/imports/api/lists/graphql/schema';
import TodoSchema from '/imports/api/todos/graphql/schema';
import { Lists } from '/imports/api/lists/lists';
import { Todos } from '/imports/api/todos/todos';

const typeDefs = [
  `
    type Query {
      allLists: [List]
      list(id: String!): [List]
    }
  `,
  ...ListSchema,
  ...TodoSchema,
];

const resolvers = {
  Query: {
    allLists: resolve(() => Lists.find()),
    list: resolve((_, args) => Lists.find({ _id: args.id }, { limit: 1 })),
  },

  List: {
    todos: resolve((root) => Todos.find({ listId: root._id }))
  },

  // Todo: {
  //   list: resolve((root) => Lists.find({ listId: root.listId }))
  // }
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

createLiveQueryServer({ schema });