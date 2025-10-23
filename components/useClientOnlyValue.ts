<<<<<<< HEAD
// This function is web-only as native doesn't currently support server (or build-time) rendering.
=======
﻿// This function is web-only as native doesn't currently support server (or build-time) rendering.
>>>>>>> restore/all
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return client;
}
