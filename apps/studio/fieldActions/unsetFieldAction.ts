import { useCallback, useEffect, useMemo, useRef } from "react";
import { ResetIcon } from "@sanity/icons/Reset";
import {
  defineDocumentFieldAction,
  getPublishedId,
  getValueAtPath,
  pathToString,
  useDocumentOperation,
  useEditState,
  usePerspective,
  type DocumentFieldActionItem,
} from "sanity";

export const unsetFieldAction = defineDocumentFieldAction({
  name: "unset",
  useAction({ documentId, documentType, path, schemaType }) {
    const { selectedPerspectiveName, selectedReleaseId } = usePerspective();
    const publishedId = getPublishedId(documentId);
    const { patch } = useDocumentOperation(
      publishedId,
      documentType,
      selectedReleaseId,
    );
    // Field actions render outside the form, so the value is read from the
    // document's edit state rather than `useFormValue`.
    const { draft, published, version } = useEditState(
      publishedId,
      documentType,
      "low",
      selectedReleaseId,
    );
    const document = selectedReleaseId ? version : (draft ?? published);
    const isEmpty = getValueAtPath(document, path) === undefined;

    // The returned action is deep-compared on every render and a new
    // `onAction` identity re-renders the field, so it must stay stable.
    const patchRef = useRef(patch);
    useEffect(() => {
      patchRef.current = patch;
    }, [patch]);

    const onAction = useCallback(() => {
      patchRef.current.execute([{ unset: [pathToString(path)] }]);
    }, [path]);

    const disabled =
      isEmpty ||
      selectedPerspectiveName === "published" ||
      Boolean(patch.disabled);
    const hidden = schemaType.readOnly === true;

    return useMemo<DocumentFieldActionItem>(
      () => ({
        type: "action",
        title: "Unset",
        icon: ResetIcon,
        tone: "critical",
        hidden,
        disabled,
        onAction,
      }),
      [disabled, hidden, onAction],
    );
  },
});
