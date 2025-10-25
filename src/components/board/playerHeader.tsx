import { Avatar, Stack, Typography, Box } from "@mui/material";
import { useAtomValue } from "jotai";
import { Chess } from "chess.js";
import { PrimitiveAtom } from "jotai";
import { Player } from "@/src/types/game";

export default function PlayerHeader({
  player,
  gameAtom,
  color,
}: {
  player: Player;
  gameAtom: PrimitiveAtom<Chess>;
  color: "w" | "b";
}) {
  const game = useAtomValue(gameAtom);

  const isPlayersTurn = game.turn() === color;
  const isCheck = ((): boolean => {
    try {
      return game.isCheck();
    } catch {
      return false;
    }
  })();

  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
      <Stack direction="row" alignItems="center" spacing={1}>
        <Avatar src={player.avatarUrl} alt={player.name} sx={{ width: 24, height: 24 }} />
        <Typography fontSize="0.9rem">{player.name}</Typography>
        {player.rating && (
          <Typography marginLeft={0.5} fontSize="0.9rem" fontWeight={200}>
            ({player.rating})
          </Typography>
        )}
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1}>
        {isPlayersTurn && (
          <Typography fontSize="0.9rem" color="#3B9AC6">
            Turn to play
          </Typography>
        )}
        {isCheck && (
          <Typography fontSize="0.9rem" color="salmon">
            Check!
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
