import { server as WebSocketServer } from 'websocket';
import { graphql } from 'graphql';
import reduce from 'async/reduce';
import http from 'http';

function resolveTypeFields(typeFields, rootValue, args, cb) {
  const resolvers = Object.values(typeFields)
    .filter(field => typeof field.resolve === 'function');
  reduce(resolvers, rootValue, (result, field, next) =>
    field.resolve(rootValue, ...args.slice(1)).then(value => next({
      ...result,
      [field.name]: value,
    })).catch(err => console.log(err))
  , result => cb(result || rootValue));
}

class LiveQuery {
  constructor(connection, id) {
    this._connection = connection;
    this._id = id;
  }

  async run(cursor, path, args) {
    const results = [];
    let initializing = true;
    const { returnType } = args[3];
    const typeFields = returnType._fields || returnType.ofType._fields;

    cursor.observeChanges({
      addedBefore: (_id, fields, before) => {
        if (initializing)
          return results.push({ _id, ...fields });

        resolveTypeFields(typeFields, { _id, ...fields }, args, fields =>
          this._connection.sendUTF(JSON.stringify({
            id: this._id,
            type: 'ADDED_BEFORE',
            before,
            path,
            fields,
          })));
      },

      changed: (_id, fields) => {
        this._connection.sendUTF(JSON.stringify({
          id: this._id,
          type: 'CHANGED',
          path,
          fields: { _id, ...fields },
        }));
      },

      movedBefore: (_id, before) => {
        this._connection.sendUTF(JSON.stringify({
          id: this._id,
          type: 'MOVED_BEFORE',
          path,
          payload: { _id, before },
        }));
      },

      removed: (_id) => {
        this._connection.sendUTF(JSON.stringify({
          id: this._id,
          type: 'REMOVED',
          path,
          payload: { _id },
        }));
      }
    });

    initializing = false;

    return results;
  }
}

function onQueryMessage(connection, message, options) {
  graphql(
    options.schema,
    message.query,
    undefined,
    { liveQuery: new LiveQuery(connection, message.id) },
    message.variables,
  ).then(response => connection.sendUTF(JSON.stringify({
    ...response,
    id: message.id,
    type: 'RESULT',
  }))).catch(err => console.log(err));
}

export function createLiveQueryServer(options) {
  const httpServer = http.createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });
  const wsServer = new WebSocketServer({ httpServer });

  wsServer.on('request', (req) => {
    const connection = req.accept('graphql-live-query', req.origin);

    connection.on('message', (message) => {
      if (message.type === 'utf8') {
        const parsed = JSON.parse(message.utf8Data);
        switch (parsed.msg) {
          case 'QUERY':
            onQueryMessage(connection, parsed, options);
            break;
        }
      }
    });
  });

  httpServer.listen(3030);
}

function pathToArray(path, arr = []) {
  if (! path.prev)
    return [path.key, ...arr];
  return pathToArray(path.prev, [path.key, ...arr]);
}

export function resolve(resolver) {
  return async function (...args) {
    const { liveQuery } = args[2];
    const { path } = args[3];
    return await liveQuery.run(resolver(...args), pathToArray(path), args);
  }
}