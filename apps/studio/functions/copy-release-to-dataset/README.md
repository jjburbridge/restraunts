# copy-release-to-dataset

Sanity [Document Function](https://www.sanity.io/docs/functions/functions-introduction) that watches for **Content Release publishes** in a source dataset and mirrors every document in the release into a target dataset in the same project.

## Trigger

Wired up in [`sanity.blueprint.ts`](../../sanity.blueprint.ts) as:

```ts
event: {
  on: ['update'],
  filter:
    '_type == "system.release" && delta::changedAny(state) && state == "published"',
  projection: '{_id, _type, name, state, finalDocumentStates}',
}
```

That combo (`update` + `delta::changedAny(state) && state == "published"`) fires exactly when a release transitions into `"published"` — including scheduled releases that flip over automatically at their `publishAt` time.

## How it works

1. The release document arrives on `event.data`, projected down to `finalDocumentStates` (a snapshot of every version doc that made up the release, in the form `versions.<releaseName>.<publishedId>`).
2. Published IDs are derived by stripping the `versions.<releaseName>.` prefix.
3. Those docs are fetched from the source dataset (`context.clientOptions.dataset`) using the `published` perspective.
4. In a single transaction against `TARGET_DATASET`:
   - IDs that came back from the fetch are `createOrReplace`d.
   - IDs that were in the release but no longer resolve in the source are treated as **deletions** — after a release publishes, docs that were marked for deletion collapse and stop resolving, so we mirror that by `delete`-ing them (and any `drafts.<id>`) in the target.

## Configuration

| Env var          | Required | Description                                                                                                                     |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `TARGET_DATASET` | ✅        | Name of the destination dataset (must live in the same Sanity project). If it equals the source dataset, the run is a no-op.    |

Set it before deploying:

```sh
npx sanity blueprints deploy
npx sanity functions env add copy-release-to-dataset TARGET_DATASET <target-dataset-name>
```

Or for local testing:

```sh
echo 'TARGET_DATASET=production-mirror' > functions/copy-release-to-dataset/.env
npx sanity functions dev
```

## Local testing

The function ships a small [event fixture](#) you can craft yourself, or you can invoke it against a real published release:

```sh
# Get a recently published release's document id (raw perspective is required)
npx sanity documents query \
  '*[_type == "system.release" && state == "published"] | order(_updatedAt desc)[0]._id' \
  --dataset production --perspective raw

# Test with that document
npx sanity functions test copy-release-to-dataset \
  --dataset production \
  --with-user-token \
  --document-id '_.releases.<release-name>'
```

## Deployment

```sh
# From the repo root
npx sanity blueprints deploy
```

The deployer picks up `sanity.blueprint.ts` and provisions the function. Because it's a document function, Sanity auto-provisions a robot token with `editor` role scoped to the project — that token is what the handler uses to read from the source dataset and write to the target dataset.

## Known limitations

- **Asset references are not mirrored.** Image and file assets live in a dataset-scoped asset store. If a copied document references an asset that doesn't exist in the target dataset, the reference will resolve to nothing. If you need this, extend the handler to `client.assets.upload()` from the source asset URL into the target dataset before writing the referring doc.
- **Deletion is inferred from absence in the source.** Any release ID that doesn't resolve in the source dataset at the time the function runs is treated as a delete. That's the same signal a release publish leaves behind, and it also means: if a doc is *created and then deleted* in the same release, we'll issue a `delete` in the target (safe no-op if it wasn't there). If someone deletes a doc in the source between the release publishing and the function running, that delete would also be propagated — the mirror is convergent, not per-mutation.
- **Cross-project mirroring is unsupported.** The token provisioned for the function is scoped to the current project. To mirror across projects, define a robot token resource in `sanity.blueprint.ts` with the necessary permissions and pass it via `robotToken` on the function definition.
