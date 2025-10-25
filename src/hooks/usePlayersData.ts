import { Chess } from "chess.js";
import { PrimitiveAtom, useAtomValue } from "jotai";
// Avatar fetch via react-query removed to avoid provider requirement during SSR/build
import { Player } from "@/types/game";

export const usePlayersData = (
  gameAtom: PrimitiveAtom<Chess>
): { white: Player; black: Player } => {
  const game = useAtomValue(gameAtom);
  const headers = game.getHeaders();

  const headersWhiteName =
    headers.White && headers.White !== "?" ? headers.White : undefined;
  const headersBlackName =
    headers.Black && headers.Black !== "?" ? headers.Black : undefined;

  const whiteName = headersWhiteName || "White";
  const blackName = headersBlackName || "Black";

  const whiteElo = Number(headers.WhiteElo) || undefined;
  const blackElo = Number(headers.BlackElo) || undefined;

  const siteHeader = headers.Site || "unknown";
  const isChessCom = siteHeader.toLowerCase().includes("chess.com");

  const whiteAvatarUrl = undefined as string | undefined;
  const blackAvatarUrl = undefined as string | undefined;

  return {
    white: {
      name: whiteName,
      rating: whiteElo,
      avatarUrl: whiteAvatarUrl ?? undefined,
    },
    black: {
      name: blackName,
      rating: blackElo,
      avatarUrl: blackAvatarUrl ?? undefined,
    },
  };
};

// No-op: avatar fetching disabled in this build
