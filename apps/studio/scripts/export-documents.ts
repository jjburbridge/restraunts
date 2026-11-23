/**
 * Interactive export of a subset of documents (plus everything they reference)
 * to an NDJSON file that can be imported with `sanity dataset import`.
 *
 * Run from apps/studio with:
 *   yarn export:documents
 */
import {execFile} from 'node:child_process'
import {createWriteStream} from 'node:fs'
import {mkdir, mkdtemp, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'
import {checkbox, confirm, input, number, select} from '@inquirer/prompts'
import type {SanityClient, SanityDocument} from 'sanity'
import {getCliClient} from 'sanity/cli'

const API_VERSION = '2025-02-19'
const FETCH_BATCH_SIZE = 200
const ASSET_TYPES: Record<string, 'image' | 'file'> = {
  'sanity.imageAsset': 'image',
  'sanity.fileAsset': 'file',
}

type SchemaType = {name: string; type: string}
type Reference = {_ref: string; _weak?: boolean; _dataset?: string; _projectId?: string}

const execFileAsync = promisify(execFile)

async function extractDocumentTypes(): Promise<string[]> {
  const dir = await mkdtemp(path.join(tmpdir(), 'sanity-schema-'))
  const schemaPath = path.join(dir, 'schema.json')
  try {
    await execFileAsync('npx', ['sanity', 'schema', 'extract', '--path', schemaPath], {
      cwd: process.cwd(),
    })
    const schema: SchemaType[] = JSON.parse(await readFile(schemaPath, 'utf8'))
    return schema
      .filter((type) => type.type === 'document' && !type.name.startsWith('sanity.'))
      .map((type) => type.name)
      .sort()
  } finally {
    await rm(dir, {recursive: true, force: true})
  }
}

function isReference(value: unknown): value is Reference {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Reference)._ref === 'string'
  )
}

function isLocalReference(ref: Reference): boolean {
  // Cross-dataset and global (e.g. Media Library) references can't be resolved in this dataset
  return !ref._dataset && !ref._projectId && !ref._ref.includes(':')
}

function collectReferences(value: unknown, refs: Map<string, boolean>) {
  if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, refs)
    return
  }
  if (typeof value !== 'object' || value === null) return

  if (isReference(value) && isLocalReference(value)) {
    const strong = !value._weak
    refs.set(value._ref, (refs.get(value._ref) ?? false) || strong)
  }
  for (const child of Object.values(value)) collectReferences(child, refs)
}

/**
 * Replaces `{asset: {_ref}}` with `{_sanityAsset: "image@<url>"}` so the import
 * re-uploads the file into the target dataset instead of referencing an asset
 * document that only exists in the source dataset.
 */
function rewriteAssets(value: unknown, assetUrls: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((item) => rewriteAssets(item, assetUrls))
  if (typeof value !== 'object' || value === null) return value

  const {asset, ...rest} = value as Record<string, unknown>
  const assetUrl = isReference(asset) ? assetUrls.get(asset._ref) : undefined
  const entries = Object.entries(assetUrl ? rest : (value as Record<string, unknown>))
  const rewritten = Object.fromEntries(
    entries.map(([key, child]) => [key, rewriteAssets(child, assetUrls)]),
  )
  return assetUrl ? {...rewritten, _sanityAsset: assetUrl} : rewritten
}

async function fetchByIds(client: SanityClient, ids: string[]): Promise<SanityDocument[]> {
  const documents: SanityDocument[] = []
  for (let i = 0; i < ids.length; i += FETCH_BATCH_SIZE) {
    const batch = ids.slice(i, i + FETCH_BATCH_SIZE)
    documents.push(...(await client.fetch<SanityDocument[]>('*[_id in $ids]', {ids: batch})))
  }
  return documents
}

async function main() {
  const baseClient = getCliClient({apiVersion: API_VERSION})
  if (!baseClient.config().token) {
    throw new Error('No auth token found. Run `sanity login`, then use `sanity exec --with-user-token`.')
  }

  console.log('Extracting studio schema…')
  const documentTypes = await extractDocumentTypes()

  const datasets = await baseClient.datasets.list()
  const dataset = await select({
    message: 'Source dataset',
    choices: datasets.map((d) => ({name: d.name, value: d.name})),
    default: baseClient.config().dataset,
  })

  const client = baseClient.withConfig({dataset, perspective: 'published', useCdn: false})

  const counts = await client.fetch<Record<string, number>>(
    `{${documentTypes.map((type, i) => `"${type}": count(*[_type == $t${i}])`).join(', ')}}`,
    Object.fromEntries(documentTypes.map((type, i) => [`t${i}`, type])),
  )

  const selectedTypes = await checkbox({
    message: 'Document types to export',
    required: true,
    choices: documentTypes.map((type) => ({
      name: `${type} (${counts[type]})`,
      value: type,
      disabled: counts[type] === 0 ? 'no published documents' : false,
    })),
  })

  const limits = new Map<string, number>()
  for (const type of selectedTypes) {
    const total = counts[type]
    const limit = await number({
      message: `How many "${type}" documents? (most recently updated first, max ${total})`,
      default: Math.min(10, total),
      min: 1,
      max: total,
      required: true,
    })
    limits.set(type, limit)
  }

  const documents = new Map<string, SanityDocument>()
  for (const [type, limit] of limits) {
    const docs = await client.fetch<SanityDocument[]>(
      `*[_type == $type] | order(_updatedAt desc) [0...${limit}]`,
      {type},
    )
    for (const doc of docs) documents.set(doc._id, doc)
  }
  const selectedCount = documents.size

  const missingStrongRefs = new Set<string>()
  let pending = [...documents.values()]
  while (pending.length > 0) {
    const refs = new Map<string, boolean>()
    collectReferences(pending, refs)
    const unresolved = [...refs.keys()].filter((id) => !documents.has(id) && !missingStrongRefs.has(id))
    if (unresolved.length === 0) break

    const fetched = await fetchByIds(client, unresolved)
    for (const doc of fetched) documents.set(doc._id, doc)
    for (const id of unresolved) {
      if (!documents.has(id) && refs.get(id)) missingStrongRefs.add(id)
    }
    pending = fetched
  }

  const assetUrls = new Map<string, string>()
  for (const doc of documents.values()) {
    const kind = ASSET_TYPES[doc._type]
    if (kind && typeof doc.url === 'string') {
      assetUrls.set(doc._id, `${kind}@${doc.url}`)
      documents.delete(doc._id)
    }
  }

  const byType = new Map<string, number>()
  for (const doc of documents.values()) byType.set(doc._type, (byType.get(doc._type) ?? 0) + 1)

  console.log('\nExport summary')
  console.table(
    [...byType].map(([type, count]) => ({
      type,
      selected: limits.get(type) ?? 0,
      'total (incl. referenced)': count,
    })),
  )
  console.log(`${selectedCount} selected, ${documents.size - selectedCount} pulled in by references, ${assetUrls.size} assets`)

  if (missingStrongRefs.size > 0) {
    console.warn(
      `\nWarning: ${missingStrongRefs.size} strong reference(s) point to documents that aren't published in "${dataset}".` +
        '\nThe import will fail unless these documents already exist in the target dataset:',
    )
    for (const id of missingStrongRefs) console.warn(`  - ${id}`)
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputPath = await input({
    message: 'Output file',
    default: path.join('exports', `${dataset}-${timestamp}.ndjson`),
  })

  if (!(await confirm({message: `Write ${documents.size} documents to ${outputPath}?`, default: true}))) {
    console.log('Cancelled.')
    return
  }

  await mkdir(path.dirname(path.resolve(outputPath)), {recursive: true})
  const stream = createWriteStream(outputPath)
  for (const doc of documents.values()) {
    stream.write(`${JSON.stringify(rewriteAssets(doc, assetUrls))}\n`)
  }
  await new Promise<void>((resolve, reject) => stream.end((error?: Error | null) => (error ? reject(error) : resolve())))

  console.log(`\nWrote ${documents.size} documents to ${outputPath}`)
  console.log(`Import with: npx sanity dataset import ${outputPath} <target-dataset> --missing`)
}

main().catch((error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.log('\nCancelled.')
    return
  }
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
