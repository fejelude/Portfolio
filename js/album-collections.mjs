import { TrackQueue } from './album-core.mjs';

// Both collections share one native element/mixer, but keep separate queues.
// In particular, recording #5 never automatically advances into the ranking.
export function collectionPlayback(recordings, discovery) {
  const original = new TrackQueue(recordings), ranked = new TrackQueue(discovery);
  const tracks = [...recordings, ...discovery];
  const queues = new Map([...recordings.map(t => [t.id, original]), ...discovery.map(t => [t.id, ranked])]);
  return {
    tracks, initialQueue: original,
    select(player, id) {
      const queue = queues.get(id);
      if (!queue || !queue.playable(id, player.failed)) return false;
      if (player.queue !== queue) {
        queue.repeat = player.queue.repeat;
        queue.setShuffle(player.queue.shuffle, id);
        player.queue = queue;
      }
      player.select(id);
      return true;
    },
  };
}
