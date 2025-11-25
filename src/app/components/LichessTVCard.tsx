'use client';

import { useEffect, useState, useRef } from 'react';
import { Box, Paper, Typography, Button, Stack, Avatar, Chip, Link as MuiLink } from '@mui/material';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { fetchTVChannels, fetchLichessGame } from '@/src/lib/lichess';
import { LichessTVChannel } from '@/src/types/lichess';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const POLL_INTERVAL = 3000; // 3 seconds

export default function LichessTVCard() {
    const [channel, setChannel] = useState<LichessTVChannel | null>(null);
    const [gameId, setGameId] = useState<string | null>(null);
    const [game, setGame] = useState(new Chess());
    const [whitePlayer, setWhitePlayer] = useState<{ name: string, rating?: number, title?: string } | null>(null);
    const [blackPlayer, setBlackPlayer] = useState<{ name: string, rating?: number, title?: string } | null>(null);
    const [orientation, setOrientation] = useState<'white' | 'black'>('white');

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Initial fetch of channel
    useEffect(() => {
        loadChannel();
        return () => stopPolling();
    }, []);

    // Poll game when gameId changes
    useEffect(() => {
        if (gameId) {
            startPollingGame();
        }
        return () => stopPolling();
    }, [gameId]);

    const stopPolling = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const loadChannel = async () => {
        const channels = await fetchTVChannels();
        if (channels && channels.Blitz) {
            const blitz = channels.Blitz;
            setChannel(blitz);
            if (blitz.gameId !== gameId) {
                setGameId(blitz.gameId);
            }
        }
    };

    const startPollingGame = () => {
        stopPolling();
        // Immediate fetch
        updateGameState();

        timerRef.current = setInterval(async () => {
            await updateGameState();
        }, POLL_INTERVAL);
    };

    const updateGameState = async () => {
        if (!gameId) return;

        // We use the existing fetchLichessGame which returns PGN
        // However, we also need player info which is in the game JSON, but fetchLichessGame only returns PGN string.
        // We might need to modify fetchLichessGame or parse PGN headers.
        // Parsing PGN headers is safer.

        const pgnOrError = await fetchLichessGame(gameId);
        if (typeof pgnOrError === 'string') {
            const pgn = pgnOrError;
            const g = new Chess();
            try {
                g.loadPgn(pgn);
                setGame(g);

                // Parse headers for player info
                const header = g.header();
                setWhitePlayer({
                    name: header['White'] || 'White',
                    rating: parseInt(header['WhiteElo'] || '0'),
                    title: header['WhiteTitle'] || undefined
                });
                setBlackPlayer({
                    name: header['Black'] || 'Black',
                    rating: parseInt(header['BlackElo'] || '0'),
                    title: header['BlackTitle'] || undefined
                });

                // Check if game over
                if (g.isGameOver()) {
                    // Game over, wait a bit then check for new game on channel
                    setTimeout(() => loadChannel(), 5000);
                }
            } catch (e) {
                console.error("PGN parse error", e);
            }
        } else {
            // Error or not found
            console.error("Error fetching game", pgnOrError);
        }
    };

    return (
        <Paper variant="outlined" sx={{
            p: 3,
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            height: '100%'
        }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                    <LiveTvIcon color="error" sx={{ animation: 'pulse 2s infinite' }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Lichess TV</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Top Rated Blitz
                        </Typography>
                    </Box>
                </Stack>
                {gameId && (
                    <Button
                        component={MuiLink}
                        href={`https://lichess.org/${gameId}`}
                        target="_blank"
                        endIcon={<OpenInNewIcon />}
                        size="small"
                        sx={{ color: 'text.secondary' }}
                    >
                        Watch
                    </Button>
                )}
            </Stack>

            <Box
                sx={{
                    position: 'relative',
                    aspectRatio: '1/1',
                    width: '100%',
                    maxWidth: 400,
                    mx: 'auto',
                    cursor: gameId ? 'pointer' : 'default',
                    '&:hover': gameId ? { opacity: 0.95 } : {}
                }}
                onClick={() => {
                    if (gameId) window.open(`https://lichess.org/${gameId}`, '_blank');
                }}
            >
                <Chessboard
                    options={{
                        position: game.fen(),
                        boardOrientation: orientation,
                        canDragPiece: () => false,
                        animationDurationInMs: 200
                    }}
                />
                {/* Player Info Overlays */}
                <Paper sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    right: 8,
                    p: 1,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 12, height: 12, bgcolor: 'white', border: '1px solid #999' }} />
                        <Typography variant="body2" color="white" fontWeight={600}>
                            {whitePlayer?.title && <span style={{ color: '#fbbf24', marginRight: 4 }}>{whitePlayer.title}</span>}
                            {whitePlayer?.name}
                        </Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.7)">
                            ({whitePlayer?.rating})
                        </Typography>
                    </Stack>
                </Paper>

                <Paper sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    right: 8,
                    p: 1,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 12, height: 12, bgcolor: 'black', border: '1px solid #666' }} />
                        <Typography variant="body2" color="white" fontWeight={600}>
                            {blackPlayer?.title && <span style={{ color: '#fbbf24', marginRight: 4 }}>{blackPlayer.title}</span>}
                            {blackPlayer?.name}
                        </Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.7)">
                            ({blackPlayer?.rating})
                        </Typography>
                    </Stack>
                </Paper>
            </Box>

            <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
        </Paper>
    );
}
