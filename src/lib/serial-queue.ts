// Runs async tasks one after another, in the order they were queued: a task starts
// only when the one before it has finished (successfully or not). The visitor
// journey uses it so a second request never starts before the first one has come
// back and set the visitor cookie. No imports, so the node tests can load it.

export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve()
  return {
    run<T>(task: () => Promise<T>): Promise<T> {
      const result = tail.then(task, task)
      tail = result.catch(() => undefined)
      return result
    },
  }
}
