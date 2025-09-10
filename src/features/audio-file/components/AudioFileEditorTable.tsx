import {
  createColumnHelper,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from "@tanstack/solid-table";
import { For } from "solid-js";
import { Table } from "@/components/table";
import { useAudioFileStore } from "../primitives/audio-file-store";
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
    cell: (info) => <PathCell originalFile={info.row.original} />,
  }),
  columnHelper.accessor("id3Tag.title", {
    header: () => "Title",
    cell: (info) => <TitleCell originalFile={info.row.original} />,
  }),
  columnHelper.accessor("id3Tag.artists", {
    header: () => "Artists",
    cell: (info) => <ArtistsCell originalFile={info.row.original} />,
  }),
  columnHelper.accessor("id3Tag.album", {
    header: () => "Album",
    cell: (info) => <AlbumCell originalFile={info.row.original} />,
  }),
  columnHelper.display({
    id: "actions",
    header: () => "Actions",
    cell: (info) => (
      <Table.Cell>
        <SaveButton file={info.row.original} />
      </Table.Cell>
    ),
  }),
];

export const AudioFileEditorTable = () => {
  const { originalFiles } = useAudioFileStore();

  const table = createSolidTable({
    get data() {
      return originalFiles();
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
              <For each={row.getVisibleCells()}>
                {(cell) =>
                  flexRender(cell.column.columnDef.cell, cell.getContext())
                }
              </For>
            </Table.Row>
          )}
        </For>
      </Table.Body>
    </Table>
  );
};
