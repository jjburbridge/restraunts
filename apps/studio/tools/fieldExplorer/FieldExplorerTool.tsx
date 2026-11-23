import {
  Suspense,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  editDocument,
  SanityApp,
  SDKStudioContext,
  useApplyDocumentActions,
  useDocumentPreview,
  useQuery,
} from "@sanity/sdk-react";
import {
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Flex,
  Select,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import { useToast } from "@sanity/ui/toast";
import { defineQuery } from "groq";
import { useWorkspace } from "sanity";
import { IntentLink } from "sanity/router";

const DOCUMENT_TYPES_QUERY = defineQuery(`array::unique(*[
  !(_id in path("_.**"))
  && !(_type match "sanity.*")
  && !(_type match "system.*")
]._type)`);

const DOCUMENT_TYPE_SAMPLE_QUERY = defineQuery(`*[
  _type == $documentType
][0...100]`);

const DOCUMENT_FIELD_VALUES_QUERY = defineQuery(`*[
  _type == $documentType
] | order(_id asc){
  _id,
  "value": @[$fieldName],
  "reference": @[$fieldName]->{
    _id,
    _type
  },
  "items": @[$fieldName][]{
    _key,
    "reference": @->{
      _id,
      _type
    }
  }
}`);

type ReferencedDocument = {
  _id: string;
  _type: string;
};

type KeyedItem = {
  _key: string;
  reference: ReferencedDocument | null;
};

type FieldValueRow = {
  _id: string;
  value: unknown;
  reference: ReferencedDocument | null;
  items: (KeyedItem | null)[] | null;
};

type SelectableValue = {
  id: string;
  documentId: string;
  path: string;
  value: unknown;
  reference: ReferencedDocument | null;
};

type FieldSelectProps = {
  documentType: string;
  value: string;
  onChange: (fieldName: string) => void;
};

function Loading({ label }: { label: string }) {
  return (
    <Flex align="center" gap={3} paddingY={2}>
      <Spinner muted />
      <Text muted size={1}>
        {label}
      </Text>
    </Flex>
  );
}

function DocumentTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (type: string) => void;
}) {
  const id = useId();
  const { data } = useQuery<string[]>({ query: DOCUMENT_TYPES_QUERY });
  const documentTypes = useMemo(
    () => [...data].sort((a, b) => a.localeCompare(b)),
    [data],
  );

  return (
    <Stack gap={3}>
      <Text as="label" htmlFor={id} size={1} weight="medium">
        Document type
      </Text>
      <Select
        id={id}
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onChange(event.currentTarget.value)
        }
      >
        <option value="">Select a document type…</option>
        {documentTypes.map((documentType) => (
          <option key={documentType} value={documentType}>
            {documentType}
          </option>
        ))}
      </Select>
    </Stack>
  );
}

function FieldSelect({ documentType, value, onChange }: FieldSelectProps) {
  const id = useId();
  const { data } = useQuery<Record<string, unknown>[]>({
    query: DOCUMENT_TYPE_SAMPLE_QUERY,
    params: { documentType },
  });

  // Field names are derived from document content, so fields that are unset
  // in every sampled document will not appear.
  const fieldNames = useMemo(() => {
    const names = new Set<string>();
    for (const document of data) {
      for (const key of Object.keys(document)) {
        if (!key.startsWith("_")) names.add(key);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [data]);

  return (
    <Stack gap={3}>
      <Text as="label" htmlFor={id} size={1} weight="medium">
        Field name
      </Text>
      <Select
        id={id}
        value={value}
        disabled={fieldNames.length === 0}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onChange(event.currentTarget.value)
        }
      >
        <option value="">
          {fieldNames.length === 0 ? "No fields found" : "Select a field…"}
        </option>
        {fieldNames.map((fieldName) => (
          <option key={fieldName} value={fieldName}>
            {fieldName}
          </option>
        ))}
      </Select>
    </Stack>
  );
}

function pluralize(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

// Keyed array items are selected individually so they can be removed from the
// array; any other value is selected as the whole field.
function getSelectableValues(
  row: FieldValueRow,
  fieldName: string,
): SelectableValue[] {
  if (row.value === null || row.value === undefined) return [];

  const { items } = row;
  if (
    Array.isArray(row.value) &&
    items &&
    items.length > 0 &&
    items.every((item): item is KeyedItem => Boolean(item?._key))
  ) {
    const values = row.value as unknown[];
    return items.map((item, index) => {
      const path = `${fieldName}[_key=="${item._key}"]`;
      return {
        id: `${row._id}:${path}`,
        documentId: row._id,
        path,
        value: values[index],
        reference: item.reference,
      };
    });
  }

  return [
    {
      id: `${row._id}:${fieldName}`,
      documentId: row._id,
      path: fieldName,
      value: row.value,
      reference: row.reference,
    },
  ];
}

type DocumentPreviewProps = {
  documentId: string;
  documentType: string;
  showType?: boolean;
};

function DocumentPreview({
  documentId,
  documentType,
  showType = false,
}: DocumentPreviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { data, isPending } = useDocumentPreview({
    documentId,
    documentType,
    ref,
  });

  return (
    <Flex
      ref={ref}
      align="center"
      gap={2}
      style={{ opacity: isPending ? 0.5 : 1 }}
    >
      {data.media?.type === "image-asset" && (
        <img
          src={`${data.media.url}?w=48&h=48&fit=crop`}
          alt=""
          width={24}
          height={24}
          style={{ borderRadius: 3, flexShrink: 0, objectFit: "cover" }}
        />
      )}
      <Box flex={1} style={{ minWidth: 0 }}>
        <Text size={1} textOverflow="ellipsis">
          <IntentLink
            intent="edit"
            params={{ id: documentId, type: documentType }}
          >
            {data.title || documentId}
          </IntentLink>
        </Text>
      </Box>
      {showType && (
        <Text size={0} muted>
          {documentType}
        </Text>
      )}
    </Flex>
  );
}

function FieldValuesTable({
  documentType,
  fieldName,
}: {
  documentType: string;
  fieldName: string;
}) {
  const { data, isPending } = useQuery<FieldValueRow[]>({
    query: DOCUMENT_FIELD_VALUES_QUERY,
    params: { documentType, fieldName },
  });
  const apply = useApplyDocumentActions();
  const toast = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isUnsetting, setIsUnsetting] = useState(false);

  const rows = useMemo(
    () =>
      data.map((row) => ({ row, values: getSelectableValues(row, fieldName) })),
    [data, fieldName],
  );
  const allValues = useMemo(() => rows.flatMap(({ values }) => values), [rows]);
  const selectedValues = allValues.filter((value) => selectedIds.has(value.id));
  const allSelected =
    allValues.length > 0 && selectedValues.length === allValues.length;

  const toggleValue = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(
      allSelected ? new Set() : new Set(allValues.map((value) => value.id)),
    );
  };

  const handleUnset = async () => {
    const pathsByDocumentId = new Map<string, string[]>();
    for (const { documentId, path } of selectedValues) {
      pathsByDocumentId.set(documentId, [
        ...(pathsByDocumentId.get(documentId) ?? []),
        path,
      ]);
    }

    setIsUnsetting(true);
    try {
      const result = await apply(
        [...pathsByDocumentId].map(([documentId, paths]) =>
          editDocument({ documentId, documentType }, { unset: paths }),
        ),
      );
      await result.submitted();
      setSelectedIds(new Set());
      toast.push({
        status: "success",
        title: `Unset ${pluralize(selectedValues.length, "value")} in ${pluralize(pathsByDocumentId.size, "document")}`,
      });
    } catch (error) {
      toast.push({
        status: "error",
        title: "Could not unset values",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsUnsetting(false);
    }
  };

  return (
    <Card
      radius={3}
      shadow={1}
      overflow="auto"
      style={{ opacity: isPending ? 0.5 : 1 }}
    >
      <Flex align="center" justify="space-between" gap={3} padding={4}>
        <Text size={1} muted>
          {pluralize(data.length, "document")}
          {selectedValues.length > 0 && ` · ${selectedValues.length} selected`}
        </Text>
        <Button
          text={
            selectedValues.length > 0
              ? `Unset ${pluralize(selectedValues.length, "value")}`
              : "Unset selected"
          }
          tone="critical"
          mode="ghost"
          fontSize={1}
          padding={2}
          disabled={selectedValues.length === 0 || isUnsetting}
          loading={isUnsetting}
          onClick={handleUnset}
        />
      </Flex>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <Card as="tr" borderTop borderBottom tone="transparent">
            <Box
              as="th"
              padding={3}
              style={{ textAlign: "left", width: "40%" }}
            >
              <Text size={1} weight="medium">
                Document
              </Text>
            </Box>
            <Box as="th" padding={3} style={{ textAlign: "left" }}>
              <Flex align="center" gap={3}>
                <Checkbox
                  aria-label="Select all values"
                  checked={allSelected}
                  indeterminate={selectedValues.length > 0 && !allSelected}
                  disabled={allValues.length === 0 || isUnsetting}
                  onChange={toggleAll}
                />
                <Text size={1} weight="medium">
                  {fieldName}
                </Text>
              </Flex>
            </Box>
          </Card>
        </thead>
        <tbody>
          {rows.map(({ row, values }) => (
            <Card as="tr" key={row._id} borderBottom>
              <Box as="td" padding={3} style={{ verticalAlign: "top" }}>
                <Suspense
                  fallback={
                    <Text size={1} muted textOverflow="ellipsis">
                      {row._id}
                    </Text>
                  }
                >
                  <DocumentPreview
                    documentId={row._id}
                    documentType={documentType}
                  />
                </Suspense>
              </Box>
              <Box as="td" padding={3}>
                {values.length === 0 ? (
                  <Text size={1} muted>
                    {formatValue(row.value)}
                  </Text>
                ) : (
                  <Stack gap={3}>
                    {values.map((value) => (
                      <Flex key={value.id} align="center" gap={3}>
                        <Checkbox
                          aria-label={`Select value in ${row._id}`}
                          checked={selectedIds.has(value.id)}
                          disabled={isUnsetting}
                          onChange={() => toggleValue(value.id)}
                        />
                        <Box flex={1} style={{ minWidth: 0 }}>
                          <FieldValue value={value} />
                        </Box>
                      </Flex>
                    ))}
                  </Stack>
                )}
              </Box>
            </Card>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function FieldValue({ value }: { value: SelectableValue }) {
  if (!value.reference) {
    const formatted = formatValue(value.value);
    return (
      <Text size={1} textOverflow="ellipsis" title={formatted}>
        {formatted}
      </Text>
    );
  }

  return (
    <Suspense
      fallback={
        <Text size={1} muted textOverflow="ellipsis">
          {value.reference._id}
        </Text>
      }
    >
      <DocumentPreview
        documentId={value.reference._id}
        documentType={value.reference._type}
        showType
      />
    </Suspense>
  );
}

function FieldExplorer() {
  const [documentType, setDocumentType] = useState("");
  const [fieldName, setFieldName] = useState("");

  const handleDocumentTypeChange = (nextDocumentType: string) => {
    setDocumentType(nextDocumentType);
    setFieldName("");
  };

  return (
    <Card height="fill" overflow="auto" padding={5} tone="transparent">
      <Container width={2}>
        <Stack gap={4}>
          <Card padding={4} radius={3} shadow={1}>
            <Stack gap={5}>
              <Suspense fallback={<Loading label="Loading document types…" />}>
                <DocumentTypeSelect
                  value={documentType}
                  onChange={handleDocumentTypeChange}
                />
              </Suspense>

              {documentType && (
                <Suspense
                  key={documentType}
                  fallback={<Loading label="Loading fields…" />}
                >
                  <FieldSelect
                    documentType={documentType}
                    value={fieldName}
                    onChange={setFieldName}
                  />
                </Suspense>
              )}
            </Stack>
          </Card>

          {documentType && fieldName && (
            <Suspense
              key={`${documentType}.${fieldName}`}
              fallback={
                <Card padding={4} radius={3} shadow={1}>
                  <Loading label="Loading documents…" />
                </Card>
              }
            >
              <FieldValuesTable
                documentType={documentType}
                fieldName={fieldName}
              />
            </Suspense>
          )}
        </Stack>
      </Container>
    </Card>
  );
}

export function FieldExplorerTool() {
  const { projectId, dataset, auth } = useWorkspace();

  // Tools only render for logged-in users, and sharing the Studio's token
  // source keeps the SDK from starting its own login flow.
  const studioWorkspace = useMemo(
    () => ({
      projectId,
      dataset,
      authenticated: true,
      auth: { token: auth.token },
    }),
    [projectId, dataset, auth.token],
  );

  return (
    <SDKStudioContext.Provider value={studioWorkspace}>
      <SanityApp fallback={<Loading label="Connecting to Sanity…" />}>
        <FieldExplorer />
      </SanityApp>
    </SDKStudioContext.Provider>
  );
}
