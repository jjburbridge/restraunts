import {Suspense, useCallback, useEffect, useRef, useState, type MouseEvent} from "react";
import {
  SanityApp,
  createDocumentHandle,
  useDocumentProjection,
} from "@sanity/sdk-react";
import {ImageIcon} from "@sanity/icons/Image";
import {InfoOutlineIcon} from "@sanity/icons/InfoOutline";
import {LaunchIcon} from "@sanity/icons/Launch";
import {WarningOutlineIcon} from "@sanity/icons/WarningOutline";
import {Badge, Button, Card, Flex, Stack, Text} from "@sanity/ui";
import {
  PatchEvent,
  set,
  useFormCallbacks,
  useFormValue,
  useSource,
  useWorkspace,
  type Asset,
  type StringInputProps,
} from "sanity";
import {useLink} from "sanity/router";

type ImageFieldValue = {
  asset?: {
    _ref?: string;
  };
};

type ImageAssetAltData = {
  altText?: string | Record<string, string> | null;
  originalFilename?: string | null;
};

const IMAGE_ASSET_ALT_PROJECTION = `{
  altText,
  originalFilename
}`;

const LOADING_FALLBACK = (
  <Card padding={4} radius={2} tone="transparent" border>
    <Text size={1} muted>
      Loading image alt text…
    </Text>
  </Card>
);

function formatStoredAlt(
  value: ImageAssetAltData["altText"],
): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (value && typeof value === "object") {
    const parts = Object.entries(value)
      .filter(([, text]) => typeof text === "string" && text.trim())
      .map(([locale, text]) => `${locale}: ${String(text).trim()}`);
    return parts.length > 0 ? parts.join(" · ") : undefined;
  }

  return undefined;
}

function mediaToolHref(basePath: string) {
  return `${basePath.replace(/\/$/, "")}/media`;
}

function OpenMediaPluginLink({assetId}: {assetId: string}) {
  const [isOpen, setIsOpen] = useState(false);
  const {basePath} = useWorkspace();
  const href = mediaToolHref(basePath);
  const {onClick} = useLink({href});
  const {form} = useSource();
  const editSource = form.image.assetSources.find(
    (source) => source.name === "edit-media",
  );
  const EditSource = editSource?.component;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const isModifiedClick =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (EditSource && !isModifiedClick && event.button === 0) {
      event.preventDefault();
      setIsOpen(true);
      return;
    }
    onClick(event);
  };

  return (
    <>
      <Button
        as="a"
        href={href}
        onClick={handleClick}
        mode="bleed"
        padding={2}
        fontSize={1}
        icon={LaunchIcon}
        text="Open in Media"
        title="Open this image in the Media plugin"
      />
      {isOpen && EditSource ? (
        <EditSource
          assetSource={editSource}
          accept="image/*"
          selectionType="single"
          selectedAssets={[{_id: assetId} as Asset]}
          onClose={() => setIsOpen(false)}
          onSelect={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}

function ImageAssetAlt({
  assetId,
  documentAlt,
  onAssetAltTextChange,
}: {
  assetId: string;
  documentAlt: string;
  onAssetAltTextChange: (assetId: string, assetAlt: string) => void;
}) {
  const documentHandle = createDocumentHandle({
    documentId: assetId,
    documentType: "sanity.imageAsset",
  });
  const {data} = useDocumentProjection<ImageAssetAltData>({
    ...documentHandle,
    projection: IMAGE_ASSET_ALT_PROJECTION,
  });

  const imageAlt = formatStoredAlt(data?.altText);

  useEffect(() => {
    onAssetAltTextChange(assetId, imageAlt ?? "");
  }, [assetId, imageAlt, onAssetAltTextChange]);

  const usesDocumentAlt = documentAlt.length > 0;
  const usesImageAlt = !usesDocumentAlt && Boolean(imageAlt);
  const tone = usesDocumentAlt
    ? "caution"
    : usesImageAlt
      ? "positive"
      : "transparent";
  const StatusIcon = usesDocumentAlt
    ? WarningOutlineIcon
    : usesImageAlt
      ? InfoOutlineIcon
      : ImageIcon;

  return (
    <Card padding={4} radius={2} tone={tone} border>
      <Stack gap={4}>
        <Flex align="flex-start" justify="space-between" gap={3} wrap="wrap">
          <Stack gap={3} flex={1}>
            <Flex align="center" gap={2} wrap="wrap">
              <Text size={1}>
                <StatusIcon />
              </Text>
              <Text size={1} weight="semibold">
                Image alt text
              </Text>
              {usesDocumentAlt ? (
                <Badge tone="caution" fontSize={0}>
                  Document overrides image
                </Badge>
              ) : usesImageAlt ? (
                <Badge tone="positive" fontSize={0}>
                  From image
                </Badge>
              ) : (
                <Badge tone="default" fontSize={0}>
                  No alt text
                </Badge>
              )}
            </Flex>
            {data?.originalFilename ? (
              <Text size={1} muted style={{overflowWrap: "anywhere"}}>
                {data.originalFilename}
              </Text>
            ) : null}
          </Stack>
          <OpenMediaPluginLink assetId={assetId} />
        </Flex>

        <Text size={1} muted>
          {usesDocumentAlt
            ? "This document's alt text will be used instead of the alt text stored on the image."
            : usesImageAlt
              ? "Alt text will come from the image because this document field is empty."
              : "No alt text on this document or on the image. Add it here to override, or open Media to store it on the image."}
        </Text>

        <Card padding={3} radius={2} tone="transparent" border>
          <Stack gap={3}>
            <Text size={0} muted weight="medium">
              Stored on image
            </Text>
            <Text
              size={1}
              weight={imageAlt ? "medium" : undefined}
              muted={!imageAlt}
              style={{overflowWrap: "anywhere"}}
            >
              {imageAlt ?? "None"}
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Card>
  );
}

export function ImageAlt(props: StringInputProps) {
  const imagePath = props.path.slice(0, -1);
  const image = useFormValue(imagePath) as ImageFieldValue | undefined;
  const assetId = image?.asset?._ref;
  const documentAlt = typeof props.value === "string" ? props.value.trim() : "";
  const {onChange} = useFormCallbacks();
  const previousAssetAltRef = useRef<{assetId: string; alt: string} | null>(
    null,
  );

  const handleAssetAltTextChange = useCallback(
    (nextAssetId: string, assetAlt: string) => {
      const previous = previousAssetAltRef.current;
      if (!previous || previous.assetId !== nextAssetId) {
        previousAssetAltRef.current = {assetId: nextAssetId, alt: assetAlt};
        return;
      }
      if (previous.alt === assetAlt) {
        return;
      }
      previousAssetAltRef.current = {assetId: nextAssetId, alt: assetAlt};
      // Form callbacks here are scoped to the image object, not the document.
      onChange(PatchEvent.from(set(Date.now(), ["altCheckNonce"])));
    },
    [onChange],
  );

  return (
    <Stack gap={4}>
      {props.renderDefault(props)}
      {assetId ? (
        <SanityApp fallback={LOADING_FALLBACK}>
          <Suspense key={assetId} fallback={LOADING_FALLBACK}>
            <ImageAssetAlt
              assetId={assetId}
              documentAlt={documentAlt}
              onAssetAltTextChange={handleAssetAltTextChange}
            />
          </Suspense>
        </SanityApp>
      ) : (
        <Card padding={4} radius={2} tone="transparent" border>
          <Text size={1} muted>
            Select an image to see alt text stored on the asset in Media.
          </Text>
        </Card>
      )}
    </Stack>
  );
}
