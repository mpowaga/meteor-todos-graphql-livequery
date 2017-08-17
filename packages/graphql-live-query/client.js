import { Random } from 'meteor/random';
import { ReactiveVar } from 'meteor/reactive-var';
import objectPath from 'object-path';

function findPath(data, path) {
  if (path.length === 0)
    return data;
  
  const [key, ...rest] = path;

  return findPath(data[key], rest);
}

export function createLiveQueryClient(cb) {
  const wsClient = new WebSocket(
    `ws://${window.location.hostname}:3030`, 'graphql-live-query');
  let callbacks = [(msg) => console.log(msg)];
  const client = {
    query(query, variables, next) {
      const id = Random.id();
      let data;
      const callback = (message) => {
        if (message.id !== id)
          return;

        if (message.type === 'RESULT') {
          data = message.data;
          next(data);
        }

        if (message.type === 'ADDED_BEFORE') {
          const item = objectPath.get(data, message.path);
          const index = message.before
            ? item.findIndex(i => i._id === message.before)
            : item.length;
          item.splice(index, 0, message.fields);
          objectPath.set(data, message.path, item);
          next(data);
        }

        if (message.type === 'CHANGED') {
          const newValue = objectPath.get(data, message.path).map(i => {
            if (i._id === message.fields._id) {
              return {
                ...i,
                ...message.fields,
              };
            }
            return i;
          });
          objectPath.set(data, message.path, newValue);
          next(data);
        }

        if (message.type === 'MOVED_BEFORE') {
          const item = objectPath.get(data, message.path);
          const index = item.findIndex(i => i._id === message.payload._id);
          const before = item.findIndex(i => i._id === message.payload.before);
          const toMove = item.splice(index, 1)[0];
          item.splice(before, 0, toMove);
          objectPath.set(data, message.path, item);
          next(data);
        }

        if (message.type === 'REMOVED') {
          const item = objectPath.get(data, message.path)
            .filter(i => i._id !== message.payload._id);
          objectPath.set(data, message.path, item);
          next(data);
        }
      };

      callbacks.push(callback);

      wsClient.send(JSON.stringify({
        msg: 'QUERY',
        id,
        query,
        variables,
      }));

      return () =>
        callbacks = callbacks.filter(cb =>
          cb !== callback);
    },
  };

  wsClient.onopen = () => cb(client);

  wsClient.onmessage = (e) => {
    const parsed = JSON.parse(e.data);
    
    callbacks.forEach(cb => cb(parsed));
  }
}

let client;

export function getLiveQueryClient(cb) {
  if (client)
    return cb(client);

  createLiveQueryClient((c) => {
    client = c;
    cb(client);
  });
}