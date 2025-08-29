import {
  createColumnHelper,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from "@tanstack/solid-table";
import { For } from "solid-js";
import { Table } from "@/components/table";
import { AudioFileEditorProvider } from "../providers/audio-file-editor";
import { useAudioFilesManager } from "../providers/audio-files-manager-provider";
import type { AudioFile } from "../schemas";
import { SaveButton } from "./ActionCell";
import { AlbumCell, ArtistsCell, PathCell, TitleCell } from "./editable-cell";

const columnHelper = createColumnHelper<AudioFile>();

const columns = [
  columnHelper.accessor("id", {
    header: () => "ID",
    cell: (info) => <Table.Cell>{info.getValue()}</Table.Cell>,
  }),
  columnHelper.accessor("path", {
    header: () => "Path",
    cell: () => <PathCell />,
  }),
  columnHelper.accessor("id3Tag.title", {
    header: () => "Title",
    cell: () => <TitleCell />,
  }),
  columnHelper.accessor("id3Tag.artists", {
    header: () => "Artists",
    cell: () => <ArtistsCell />,
  }),
  columnHelper.accessor("id3Tag.album", {
    header: () => "Album",
    cell: () => <AlbumCell />,
  }),
  columnHelper.display({
    id: "actions",
    header: () => "Actions",
    cell: () => (
      <Table.Cell>
        <SaveButton />
      </Table.Cell>
    ),
  }),
];

export const AudioFileEditorTable = () => {
  const { audioFiles } = useAudioFilesManager();

  const table = createSolidTable({
    get data() {
      return [...audioFiles];
    },
    columns,
    getRowId: (file) => file.id,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <Table.Header>
        <For each={table.getHeaderGroups()}>
          {(headerGroup) => (
            <Table.HeaderRow>
              <For each={headerGroup.headers}>
                {(header) => (
                  <Table.HeaderCell>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </Table.HeaderCell>
                )}
              </For>
            </Table.HeaderRow>
          )}
        </For>
      </Table.Header>
      <Table.Body>
        <For each={table.getRowModel().rows}>
          {(row) => (
            <Table.Row>
              <AudioFileEditorProvider original={() => row.original}>
                <For each={row.getVisibleCells()}>
                  {(cell) =>
                    flexRender(cell.column.columnDef.cell, cell.getContext())
                  }
                </For>
              </AudioFileEditorProvider>
            </Table.Row>
          )}
        </For>
      </Table.Body>
    </Table>
  );
};
