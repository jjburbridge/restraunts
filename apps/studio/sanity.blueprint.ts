import {defineBlueprint, defineDocumentFunction} from '@sanity/blueprints'

/**
 * Blueprint configuration for this project's Sanity Functions.
 *
 * The `copy-release-to-dataset` function runs when a Content Release
 * transitions into the `"published"` state and mirrors the published
 * documents into another dataset in the same project.
 *
 * Set the target dataset via the `TARGET_DATASET` env var — either on the
 * deployed function (`sanity functions env add copy-release-to-dataset
 * TARGET_DATASET <name>`) or locally in a `.env` file next to this
 * blueprint when testing with `sanity functions test`.
 */
export default defineBlueprint({
  resources: [
    defineDocumentFunction({
      name: 'copy-release-to-dataset',
      src: './functions/copy-release-to-dataset',
      memory: 2,
      timeout: 60,
      event: {
        on: ['update'],
        filter:
          '_type == "system.release" && delta::changedAny(state) && state == "published"',
        projection: '{_id, _type, name, state, finalDocumentStates}',
      },
    }),
  ],
})
