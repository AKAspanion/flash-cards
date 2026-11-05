// Every local port this project uses, one block from 2100. firebase.json keeps
// the emulator ports as literals (the Firebase CLI reads plain JSON);
// tests/unit/devPorts.spec.ts fails when they differ from this map.
export const DEV_PORTS = {
  devServer: 2100,
  hub: 2101,
  auth: 2102,
  firestore: 2103,
  firestoreWebsocket: 2104,
  logging: 2105,
  hosting: 2106,
  preview: 2107,
  e2ePreview: 2108,
} as const
export type DevPort = keyof typeof DEV_PORTS
