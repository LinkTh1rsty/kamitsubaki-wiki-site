/** The host adapter is an anonymous public reader; editing stays on the Wiki. */
export function useUserSession() {
  return {
    loggedIn: computed(() => false),
    user: computed(() => null),
    session: computed(() => ({})),
    ready: computed(() => true),
    clear: async () => {},
    fetch: async () => {},
  }
}
