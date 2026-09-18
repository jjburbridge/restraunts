import {documentEventHandler} from '@sanity/functions'
import {createClient, type SanityClient, type SanityDocument} from '@sanity/client'

/**
 * When a Content Release is published in the source dataset, mirror every
 * document that was part of that release into a target dataset in the same
 * project.
 *
 * The function is triggered by an `update` on a `system.release` document
 * whose `state` field just transitioned to `"published"` (see the blueprint
 * filter in `sanity.blueprint.ts`).
 *
 * The release document itself carries `finalDocumentStates`, a snapshot of
 * every version document that made up the release at the moment it went live
 * (e.g. `versions.<releaseName>.<publishedId>`). We derive the underlying
 * published IDs from those entries, fetch the freshly-published documents
 * from the source dataset, and `createOrReplace` them in the target dataset.
 *
 * Configuration (via blueprint env):
 *   - TARGET_DATASET (required): the dataset to copy documents into.
 *
 * Deletions inside the release are propagated by treating any ID in
 * `finalDocumentStates` that no longer resolves in the source dataset as a
 * deletion — after a release publishes, "delete" version docs collapse the
 * corresponding published doc, so it simply won't come back from a fetch.
 *
 * Known limitations:
 *   - Asset references (images, files) point at the source dataset's asset
 *     store; those assets must exist in the target dataset (or be copied
 *     separately) for references to resolve.
 */

const SANITY_API_VERSION = '2025-02-19'
const RELEASE_VERSION_PREFIX = /^versions\.[^.]+\./

interface ReleaseDocument extends SanityDocument {
  _type: 'system.release'
  name?: string
  state?: string
  finalDocumentStates?: Array<{id: string; _key?: string}> | null
}

export const handler = documentEventHandler<ReleaseDocument>(
  async ({context, event}) => {
    const release = event.data

    const targetDataset = process.env.TARGET_DATASET
    if (!targetDataset) {
      throw new Error(
        'TARGET_DATASET env var is not set. Configure it in sanity.blueprint.ts.',
      )
    }

    const sourceDataset = context.clientOptions.dataset
    if (!sourceDataset) {
      throw new Error('No source dataset in context.clientOptions.')
    }
    if (sourceDataset === targetDataset) {
      console.warn(
        `Source and target dataset are the same (${sourceDataset}); skipping copy.`,
      )
      return
    }

    if (release.state !== 'published') {
      console.warn(
        `Release ${release._id} fired with state="${release.state}" (expected "published"); skipping.`,
      )
      return
    }

    const finalStates = release.finalDocumentStates ?? []
    if (finalStates.length === 0) {
      console.log(`Release ${release._id} has no finalDocumentStates; nothing to copy.`)
      return
    }

    const publishedIds = Array.from(
      new Set(
        finalStates
          .map((s) => s?.id)
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.replace(RELEASE_VERSION_PREFIX, '')),
      ),
    )

    console.log(
      `Release "${release.name ?? release._id}" published in "${sourceDataset}"; ` +
        `copying ${publishedIds.length} document(s) to "${targetDataset}".`,
    )

    const sourceClient = createClient({
      ...context.clientOptions,
      dataset: sourceDataset,
      apiVersion: SANITY_API_VERSION,
      useCdn: false,
      perspective: 'published',
    })

    const targetClient = createClient({
      ...context.clientOptions,
      dataset: targetDataset,
      apiVersion: SANITY_API_VERSION,
      useCdn: false,
    })

    const documents = await fetchDocuments(sourceClient, publishedIds)
    const foundIds = new Set(documents.map((doc) => doc._id))
    const deletedIds = publishedIds.filter((id) => !foundIds.has(id))

    if (documents.length === 0 && deletedIds.length === 0) {
      console.log('Nothing to mirror.')
      return
    }

    const transaction = targetClient.transaction()
    for (const doc of documents) {
      transaction.createOrReplace(stripMutableSystemFields(doc))
    }
    for (const id of deletedIds) {
      // Also drop any draft that happens to live alongside the published doc
      // in the target — Sanity's delete-by-id silently no-ops on missing docs.
      transaction.delete(id)
      transaction.delete(`drafts.${id}`)
    }

    const result = await transaction.commit({
      autoGenerateArrayKeys: false,
      returnDocuments: false,
    })

    console.log(
      `Mirrored release "${release.name ?? release._id}" to "${targetDataset}": ` +
        `${documents.length} upsert(s), ${deletedIds.length} delete(s) ` +
        `(transactionId=${result.transactionId}).`,
    )
    if (deletedIds.length > 0) {
      console.log(`Deleted IDs: ${deletedIds.join(', ')}`)
    }
  },
)

async function fetchDocuments(
  client: SanityClient,
  ids: readonly string[],
): Promise<SanityDocument[]> {
  if (ids.length === 0) return []
  const docs = await client.fetch<SanityDocument[]>(
    '*[_id in $ids]',
    {ids: [...ids]},
  )
  return docs ?? []
}

function stripMutableSystemFields(doc: SanityDocument): SanityDocument {
  // The target document should keep its own _rev / _updatedAt lineage.
  // Preserving _createdAt lets the target mirror the original creation time.
  const {_rev, _updatedAt, ...rest} = doc as SanityDocument & {
    _rev?: string
    _updatedAt?: string
  }
  return rest as SanityDocument
}
