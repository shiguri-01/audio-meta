import {
  createColumnHelper,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from "@tanstack/solid-table";
import { For } from "solid-js";
import { Table } from "@/components/table";
import type { AudioFileDTO } from "@/tauri/dto";
import { AudioFileEditorProvider } from "../providers/audio-file-editor";
import { useAudioFilesManager } from "../providers/audio-files-manager-provider";

const columnHelper = createColumnHelper<AudioFileDTO>();

const columns = [
  columnHelper.accessor("id", {
    header: () => "ID",
  }),
  columnHelper.accessor("path", {
    header: () => "Path",
  }),
  columnHelper.accessor("id3_tag.title", {
    header: () => "Title",
  }),
  columnHelper.accessor("id3_tag.artists", {
    header: () => "Artists",
  }),
  columnHelper.accessor("id3_tag.album", {
    header: () => "Album",
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
                  {(cell) => (
                    <Table.Cell>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Table.Cell>
                  )}
                </For>
              </AudioFileEditorProvider>
            </Table.Row>
          )}
        </For>
      </Table.Body>
    </Table>
  );
};
