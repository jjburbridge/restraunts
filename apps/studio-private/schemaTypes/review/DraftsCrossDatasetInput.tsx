import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FocusEventHandler,
} from "react";
import {SanityApp, useQuery} from "@sanity/sdk-react";
import {LaunchIcon} from "@sanity/icons/Launch";
import {SearchIcon} from "@sanity/icons/Search";
import {WarningOutlineIcon} from "@sanity/icons/WarningOutline";
import {Autocomplete} from "@sanity/ui/autocomplete";
import {Badge, Button, Card, Flex, Stack, Text} from "@sanity/ui";
import {
  getPublishedId,
  isDraftId,
  set,
  unset,
  useProjectId,
  type CrossDatasetReferenceInputProps,
} from "sanity";

const SEARCH_LIMIT = 50;
const GROQ_FIELD_PATH =
  /^[A-Za-z_][A-Za-z0-9_]*((\.|->)[A-Za-z_][A-Za-z0-9_]*)*$/;

export type DraftsCrossDatasetPreview = {
  select: {
    title: string;
    subtitle?: string;
  };
};

export type DraftsCrossDatasetInputOptions = {
  type: string;
  preview: DraftsCrossDatasetPreview;
};

type DraftsCrossDatasetInputProps = CrossDatasetReferenceInputProps &
  Partial<DraftsCrossDatasetInputOptions>;

type CrossDatasetReferenceValue = NonNullable<
  DraftsCrossDatasetInputProps["value"]
>;

type ProductionResource = {
  projectId: string;
  dataset: string;
};

type PreviewQuery = {
  documentType: string;
  titleField: string;
  subtitleField?: string;
  query: string;
};

type DocumentHit = {
  _id: string;
  _originalId?: string;
  title?: string;
  subtitle?: string;
};

type DocumentOption = {
  value: string;
  title: string;
  subtitle?: string;
  hasPublished: boolean;
};

type DocumentQueryResult = {
  items?: DocumentHit[];
  selected?: DocumentHit | null;
};

const PUBLISHED_IDS_QUERY = /* groq */ `*[_id in $ids]._id`;

const LOADING_FALLBACK = (
  <Card padding={3} radius={2} border>
    <Text size={1} muted>
      Loading…
    </Text>
  </Card>
);

function isSafeGroqField(path: string) {
  return GROQ_FIELD_PATH.test(path);
}

function toGroqField(path: string, fallback: string) {
  const trimmed = path.trim();
  if (!isSafeGroqField(trimmed)) return fallback;
  if (trimmed.includes("->")) return trimmed;
  const parts = trimmed.split(".");
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join("->")}->${parts[parts.length - 1]}`;
}

function humanizeType(documentType: string) {
  return documentType.replace(/[_-]+/g, " ");
}

function resolveInputOptions(
  props: DraftsCrossDatasetInputProps,
): DraftsCrossDatasetInputOptions | undefined {
  const schemaTarget = props.schemaType.to.find(
    (target) => !props.type || target.type === props.type,
  );
  const documentType = props.type ?? schemaTarget?.type;
  const preview = props.preview ?? schemaTarget?.preview;

  if (!documentType || !preview?.select?.title) return undefined;

  return {
    type: documentType,
    preview: {
      select: {
        title: preview.select.title,
        subtitle:
          typeof preview.select.subtitle === "string"
            ? preview.select.subtitle
            : undefined,
      },
    },
  };
}

function buildPreviewQuery(options: DraftsCrossDatasetInputOptions): PreviewQuery {
  const titleField = toGroqField(options.preview.select.title, "title");
  const subtitleField = options.preview.select.subtitle
    ? toGroqField(options.preview.select.subtitle, "")
    : undefined;
  const subtitleProjection = subtitleField
    ? `,\n    "subtitle": ${subtitleField}`
    : "";

  return {
    documentType: options.type,
    titleField,
    subtitleField: subtitleField || undefined,
    query: `{
  "items": *[
    _type == $documentType
    && ($search == "" || ${titleField} match $search)
  ] | order(${titleField} asc)[0...${SEARCH_LIMIT}] {
    _id,
    _originalId,
    "title": ${titleField}${subtitleProjection}
  },
  "selected": *[_id == $publishedId && _type == $documentType][0] {
    _id,
    _originalId,
    "title": ${titleField}${subtitleProjection}
  }
}`,
  };
}

function hitToOption(
  hit: DocumentHit,
  publishedIds: Set<string>,
  documentType: string,
): DocumentOption {
  const value = getPublishedId(hit._id);
  return {
    value,
    title: hit.title?.trim() || `Untitled ${humanizeType(documentType)}`,
    subtitle: hit.subtitle,
    hasPublished: publishedIds.has(value),
  };
}

function uniqueHits(hits: DocumentHit[]): DocumentHit[] {
  const byPublishedId = new Map<string, DocumentHit>();

  for (const hit of hits) {
    const publishedId = getPublishedId(hit._id);
    const existing = byPublishedId.get(publishedId);
    const fromDraft = isDraftId(hit._originalId ?? hit._id);
    if (!existing || fromDraft) {
      byPublishedId.set(publishedId, hit);
    }
  }

  return [...byPublishedId.values()];
}

function optionsEqual(a: DocumentOption[], b: DocumentOption[]) {
  return (
    a.length === b.length &&
    a.every(
      (option, index) =>
        option.value === b[index].value &&
        option.title === b[index].title &&
        option.subtitle === b[index].subtitle &&
        option.hasPublished === b[index].hasPublished,
    )
  );
}

function renderDocumentOption(option: DocumentOption) {
  const unpublished = !option.hasPublished;

  return (
    <Card
      data-as="button"
      padding={3}
      radius={2}
      tone={unpublished ? "caution" : "inherit"}
    >
      <Flex align="center" gap={3}>
        {unpublished ? (
          <Text size={1}>
            <WarningOutlineIcon />
          </Text>
        ) : null}
        <Stack gap={2} flex={1}>
          <Text size={1} weight="medium" textOverflow="ellipsis">
            {option.title}
          </Text>
          {option.subtitle ? (
            <Text size={1} muted textOverflow="ellipsis">
              {option.subtitle}
            </Text>
          ) : null}
        </Stack>
        {unpublished ? (
          <Badge fontSize={1} tone="caution">
            Unpublished
          </Badge>
        ) : null}
      </Flex>
    </Card>
  );
}

function PublishedFlagsFetcher({
  resource,
  hits,
  documentType,
  onOptions,
}: {
  resource: ProductionResource;
  hits: DocumentHit[];
  documentType: string;
  onOptions: (options: DocumentOption[]) => void;
}) {
  const ids = hits.map((hit) => getPublishedId(hit._id));
  const {data} = useQuery<string[]>({
    ...resource,
    perspective: "published",
    query: PUBLISHED_IDS_QUERY,
    params: {ids: ids.length > 0 ? ids : ["__none__"]},
  });

  const publishedIds = new Set(data ?? []);
  const options = hits.map((hit) =>
    hitToOption(hit, publishedIds, documentType),
  );

  useEffect(() => {
    onOptions(options);
  }, [onOptions, options]);

  return null;
}

function DocumentOptionsFetcher({
  resource,
  search,
  selectedId,
  previewQuery,
  onOptions,
}: {
  resource: ProductionResource;
  search: string;
  selectedId?: string;
  previewQuery: PreviewQuery;
  onOptions: (options: DocumentOption[]) => void;
}) {
  const publishedId = selectedId ? getPublishedId(selectedId) : "__none__";
  const {data} = useQuery<DocumentQueryResult>({
    ...resource,
    perspective: "drafts",
    query: previewQuery.query,
    params: {
      documentType: previewQuery.documentType,
      search: search ? `*${search}*` : "",
      publishedId,
    },
  });

  const hits = uniqueHits([
    ...(data?.items ?? []),
    ...(data?.selected ? [data.selected] : []),
  ]);

  return (
    <PublishedFlagsFetcher
      resource={resource}
      hits={hits}
      documentType={previewQuery.documentType}
      onOptions={onOptions}
    />
  );
}

function DocumentCombobox({
  resource,
  selectedId,
  readOnly,
  id,
  studioUrl,
  typeTitle,
  previewQuery,
  onFocus,
  onBlur,
  onSelect,
  onClear,
}: {
  resource: ProductionResource;
  selectedId?: string;
  readOnly?: boolean;
  id: string;
  studioUrl?: string | null;
  typeTitle: string;
  previewQuery: PreviewQuery;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onSelect: (publishedId: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<DocumentOption[]>([]);
  const search = useDeferredValue(query.trim());

  const handleOptions = useCallback((nextOptions: DocumentOption[]) => {
    setOptions((current) =>
      optionsEqual(current, nextOptions) ? current : nextOptions,
    );
  }, []);

  const selectedOption = options.find((option) => option.value === selectedId);
  const unpublishedSelected = Boolean(
    selectedOption && !selectedOption.hasPublished,
  );

  return (
    <Stack gap={2}>
      <Autocomplete
        id={id}
        icon={unpublishedSelected ? WarningOutlineIcon : SearchIcon}
        value={selectedId}
        options={options}
        filterOption={() => true}
        readOnly={readOnly}
        openOnFocus
        openButton
        placeholder={`Search ${typeTitle.toLowerCase()}`}
        onQueryChange={(nextQuery) => setQuery(nextQuery ?? "")}
        onSelect={(nextId) => onSelect(nextId)}
        onChange={(nextValue) => {
          if (!nextValue) onClear();
        }}
        renderOption={renderDocumentOption}
        renderValue={(_value, option) => option?.title ?? ""}
        listBox={{padding: 1}}
        onFocus={onFocus}
        onBlur={onBlur}
        suffix={
          studioUrl ? (
            <Button
              as="a"
              href={studioUrl}
              target="_blank"
              rel="noreferrer"
              mode="bleed"
              padding={2}
              fontSize={1}
              icon={LaunchIcon}
              title="Open in production Studio"
            />
          ) : undefined
        }
      />
      {unpublishedSelected ? (
        <Card padding={3} radius={2} tone="caution">
          <Flex align="center" gap={3}>
            <Text size={1}>
              <WarningOutlineIcon />
            </Text>
            <Text size={1}>
              This {typeTitle.toLowerCase()} has no published version.
            </Text>
          </Flex>
        </Card>
      ) : null}
      <Suspense fallback={null}>
        <DocumentOptionsFetcher
          resource={resource}
          search={search}
          selectedId={selectedId}
          previewQuery={previewQuery}
          onOptions={handleOptions}
        />
      </Suspense>
    </Stack>
  );
}

function DraftsCrossDatasetInputFields({
  value,
  onChange,
  readOnly,
  schemaType,
  id,
  elementProps,
  resource,
  options,
}: DraftsCrossDatasetInputProps & {
  resource: ProductionResource;
  options: DraftsCrossDatasetInputOptions;
}) {
  const selectedId = value?._ref ? getPublishedId(value._ref) : undefined;
  const previewQuery = useMemo(() => buildPreviewQuery(options), [options]);
  const schemaTarget = schemaType.to.find(
    (target) => target.type === options.type,
  );
  const typeTitle = schemaTarget?.title || humanizeType(options.type);

  const handleSelect = useCallback(
    (publishedId: string) => {
      onChange(
        set({
          _type: schemaType.name,
          _ref: getPublishedId(publishedId),
          _dataset: resource.dataset,
          _projectId: resource.projectId,
          ...(schemaType.weak ? {_weak: true} : {}),
        } satisfies CrossDatasetReferenceValue),
      );
    },
    [
      onChange,
      resource.dataset,
      resource.projectId,
      schemaType.name,
      schemaType.weak,
    ],
  );

  const handleClear = useCallback(() => {
    onChange(unset());
  }, [onChange]);

  const studioUrl = selectedId
    ? schemaType.studioUrl?.({
        id: selectedId,
        type: options.type,
      })
    : null;

  return (
    <DocumentCombobox
      resource={resource}
      selectedId={selectedId}
      readOnly={readOnly}
      id={id}
      studioUrl={studioUrl}
      typeTitle={typeTitle}
      previewQuery={previewQuery}
      onFocus={elementProps.onFocus}
      onBlur={elementProps.onBlur}
      onSelect={handleSelect}
      onClear={handleClear}
    />
  );
}

/**
 * Generic cross-dataset picker that includes unpublished drafts. Pass `type`
 * and `preview.select` (title/subtitle field paths). Falls back to the field's
 * `to` definition when those props are omitted.
 */
export function DraftsCrossDatasetInput(props: DraftsCrossDatasetInputProps) {
  const projectId = useProjectId();
  const dataset = props.schemaType.dataset;
  const resource = useMemo(
    () => ({projectId, dataset}),
    [projectId, dataset],
  );
  const previewTitle = props.preview?.select?.title;
  const previewSubtitle = props.preview?.select?.subtitle;
  const options = useMemo(
    () => resolveInputOptions(props),
    [
      previewSubtitle,
      previewTitle,
      props.schemaType.to,
      props.type,
    ],
  );

  if (!options) {
    return (
      <Card padding={3} radius={2} tone="critical">
        <Text size={1}>
          DraftsCrossDatasetInput needs a document type and preview.select.title.
        </Text>
      </Card>
    );
  }

  return (
    <SanityApp fallback={LOADING_FALLBACK}>
      <DraftsCrossDatasetInputFields
        {...props}
        resource={resource}
        options={options}
      />
    </SanityApp>
  );
}

export function createDraftsCrossDatasetInput(
  options: DraftsCrossDatasetInputOptions,
) {
  return function ConfiguredDraftsCrossDatasetInput(
    props: CrossDatasetReferenceInputProps,
  ) {
    return <DraftsCrossDatasetInput {...props} {...options} />;
  };
}
