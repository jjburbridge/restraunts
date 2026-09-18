import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 's6y3amel',
    dataset: 'private',
  },
  server: {
    port: 3334,
  },
})
