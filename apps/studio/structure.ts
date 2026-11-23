import { FolderIcon } from "@sanity/icons/Folder";
import type { StructureResolver } from "sanity/structure";

const RESTAURANT_TYPES = ["restaurant", "location"];

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .showCount()
        .title("Restaurants")
        .icon(FolderIcon)
        .child(
          S.list()
            .title("Restaurants")
            .items([
              S.documentTypeListItem("restaurant")
                .title("Restaurants")
                .showCount(),
              S.documentTypeListItem("location").title("Locations"),
            ]),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (listItem) => !RESTAURANT_TYPES.includes(listItem.getId() ?? ""),
      ),
    ]);
