"use client";

import Grid from "@mui/material/Grid";
import { Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridRowId,
  GridLocaleText,
  GRID_DEFAULT_LOCALE_TEXT,
} from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { blue, red } from "@mui/material/colors";
import { useRouter } from "next/navigation";
import type { Game } from "@/types/game";
import { openDB, type DBSchema } from "idb";

interface GameDatabaseSchema extends DBSchema {
  games: {
    value: Game;
    key: number;
  };
}

async function getDb() {
  return openDB<GameDatabaseSchema>("games", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("games")) {
        db.createObjectStore("games", { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export default function RecordsPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);

  const reload = useCallback(async () => {
    const db = await getDb();
    const all = await db.getAll("games");
    setGames(all);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleDeleteGameRow = useCallback(
    (id: GridRowId) => async () => {
      if (typeof id !== "number") return;
      const db = await getDb();
      await db.delete("games", id);
      reload();
    },
    [reload]
  );

  const handleCopyGameRow = useCallback(
    (id: GridRowId) => async () => {
      if (typeof id !== "number") return;
      const game = games.find((g) => g.id === id);
      if (!game) return;
      await navigator.clipboard?.writeText?.(game.pgn);
    },
    [games]
  );

  const columns: GridColDef<Game>[] = useMemo(
    () => [
      { field: "event", headerName: "Event", width: 150 },
      { field: "site", headerName: "Site", width: 150 },
      { field: "date", headerName: "Date", width: 150 },
      {
        field: "round",
        headerName: "Round",
        headerAlign: "center",
        align: "center",
        width: 120,
      },
      {
        field: "whiteLabel",
        headerName: "White",
        width: 200,
        headerAlign: "center",
        align: "center",
        valueGetter: (_: any, row: Game) =>
          `${row.white.name ?? "Unknown"} (${row.white.rating ?? "?"})`,
      },
      {
        field: "result",
        headerName: "Result",
        headerAlign: "center",
        align: "center",
        width: 100,
      },
      {
        field: "blackLabel",
        headerName: "Black",
        width: 200,
        headerAlign: "center",
        align: "center",
        valueGetter: (_: any, row: Game) =>
          `${row.black.name ?? "Unknown"} (${row.black.rating ?? "?"})`,
      },
      {
        field: "eval",
        headerName: "Evaluation",
        type: "boolean",
        headerAlign: "center",
        align: "center",
        width: 120,
        valueGetter: (_: any, row: Game) => !!row.eval,
      },
      {
        field: "openEvaluation",
        type: "actions",
        headerName: "Analyze",
        width: 100,
        getActions: ({ id }: { id: GridRowId }) => [
          <GridActionsCellItem
            key={`${id}-open-eval-button`}
            icon={<Icon icon="streamline:magnifying-glass-solid" width="20px" />}
            label="Open Evaluation"
            onClick={() => router.push(`/analyze?gameId=${id}`)}
            color="inherit"
          />,
        ],
      },
      {
        field: "delete",
        type: "actions",
        headerName: "Delete",
        width: 100,
        getActions: ({ id }: { id: GridRowId }) => [
          <GridActionsCellItem
            key={`${id}-delete-button`}
            icon={<Icon icon="mdi:delete-outline" color={red[400]} width="20px" />}
            label="Delete"
            onClick={handleDeleteGameRow(id)}
            color="inherit"
          />,
        ],
      },
      {
        field: "copy pgn",
        type: "actions",
        headerName: "Copy pgn",
        width: 110,
        getActions: ({ id }: { id: GridRowId }) => [
          <GridActionsCellItem
            key={`${id}-copy-button`}
            icon={<Icon icon="ri:clipboard-line" color={blue[400]} width="20px" />}
            label="Copy pgn"
            onClick={handleCopyGameRow(id)}
            color="inherit"
          />,
        ],
      },
    ],
    [handleDeleteGameRow, handleCopyGameRow, router]
  );

  return (
      <Grid container justifyContent="center" alignItems="center" gap={4} marginTop={6}>
      <Grid container justifyContent="center" alignItems="center" size={12}>
        <Typography variant="subtitle2">
          You have {games.length} game{games.length !== 1 && "s"} in your records
        </Typography>
      </Grid>

      <Grid maxWidth="100%" minWidth="50px" sx={{ width: "95%" }}>
        <DataGrid
          aria-label="Games list"
          rows={games}
          columns={columns}
          disableColumnMenu
          hideFooter
          localeText={gridLocaleText}
          initialState={{
            sorting: {
              sortModel: [
                {
                  field: "date",
                  sort: "desc",
                },
              ],
            },
          }}
        />
      </Grid>
      </Grid>
  );
}

const gridLocaleText: GridLocaleText = {
  ...GRID_DEFAULT_LOCALE_TEXT,
  noRowsLabel: "No games found",
};
