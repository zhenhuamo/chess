'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { DailyPuzzle } from '@/types/puzzle';
import RefreshIcon from '@mui/icons-material/Refresh';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import InsightsIcon from '@mui/icons-material/Insights';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const SEEN_STORAGE_KEY = 'daily-puzzle-seen';
const EXCLUDE_LIMIT = 200;
const LOCAL_CACHE_LIMIT = 500;

type PuzzleResponse = DailyPuzzle & Record<string, unknown>;

const playMoveSound = () => {
    try {
        // Placeholder for a future audio effect
    } catch {
        // ignore
    }
};

const createPuzzleGame = (fen: string) => {
    const game = new Chess();
    console.log('[daily-puzzle] loading FEN:', fen);
    try {
        game.load(fen);
    } catch (error) {
        console.warn('[daily-puzzle] invalid FEN, resetting board', fen, error);
        game.reset();
    }
    return game;
};

export default function DailyPuzzleCard() {
    const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
    const [game, setGame] = useState(new Chess());
    const [status, setStatus] = useState<'loading' | 'playing' | 'solved' | 'failed'>('loading');
    const [solutionIndex, setSolutionIndex] = useState(0);
    const [orientation, setOrientation] = useState<'white' | 'black'>('white');
    const [showThemes, setShowThemes] = useState(false);
    const [moveFrom, setMoveFrom] = useState<Square | null>(null);
    const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});
    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [storageReady, setStorageReady] = useState(false);

    const pendingTimeouts = useRef<number[]>([]);
    const seenIdsRef = useRef<Set<string>>(new Set());

    const persistSeen = useCallback(() => {
        if (typeof window === 'undefined') return;
        const ids = Array.from(seenIdsRef.current);
        const trimmed = ids.slice(-LOCAL_CACHE_LIMIT);
        seenIdsRef.current = new Set(trimmed);
        window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(trimmed));
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(SEEN_STORAGE_KEY);
        if (stored) {
            try {
                const parsed: string[] = JSON.parse(stored);
                seenIdsRef.current = new Set(parsed);
            } catch {
                seenIdsRef.current = new Set();
            }
        }
        setStorageReady(true);
    }, []);

    const clearPendingTimeouts = useCallback(() => {
        pendingTimeouts.current.forEach((id) => window.clearTimeout(id));
        pendingTimeouts.current = [];
    }, []);

    const initializePuzzleState = useCallback((data: DailyPuzzle) => {
        clearPendingTimeouts();
        setPuzzle(data);
        const puzzleGame = createPuzzleGame(data.fen);
        setGame(puzzleGame);
        setOrientation(puzzleGame.turn() === 'w' ? 'white' : 'black');
        setStatus('playing');
        setSolutionIndex(0);
        setMoveFrom(null);
        setOptionSquares({});
        setShowThemes(false);
    }, [clearPendingTimeouts]);

    const fetchPuzzle = useCallback(async () => {
        if (!storageReady) return;
        setIsFetching(true);
        setStatus('loading');
        setFetchError(null);

        try {
            const exclude = Array.from(seenIdsRef.current).slice(-EXCLUDE_LIMIT);
            const params = new URLSearchParams();
            if (exclude.length) {
                params.set('exclude', exclude.join(','));
            }

            const res = await fetch(`/api/puzzles${params.size ? `?${params.toString()}` : ''}`, {
                cache: 'no-store',
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error((payload as any).error || '获取谜题失败，请稍后重试。');
            }

            const data: PuzzleResponse = await res.json();
            seenIdsRef.current.add(data.id);
            persistSeen();
            initializePuzzleState(data);
        } catch (error) {
            console.error('[daily-puzzle]', error);
            setFetchError(error instanceof Error ? error.message : '加载谜题失败，请稍后再试。');
            setStatus('failed');
        } finally {
            setIsFetching(false);
        }
    }, [initializePuzzleState, persistSeen, storageReady]);

    useEffect(() => {
        if (!storageReady) return;
        void fetchPuzzle();
    }, [fetchPuzzle, storageReady]);

    useEffect(() => () => clearPendingTimeouts(), [clearPendingTimeouts]);

    const getMoveOptions = (square: Square) => {
        const moves = game.moves({ square, verbose: true });
        if (moves.length === 0) {
            setOptionSquares({});
            return false;
        }

        const newSquares: Record<string, any> = {};
        moves.forEach((move) => {
            newSquares[move.to] = {
                background:
                    game.get(move.to) && game.get(move.to)!.color !== game.get(square)!.color
                        ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
                        : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
                borderRadius: '50%',
                boxShadow: 'inset 0 0 1px 4px rgba(100, 200, 100, 0.8)',
            };
        });
        newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
        setOptionSquares(newSquares);
        return true;
    };

    const handlePieceDrop = (sourceSquare: Square, targetSquare: Square) => {
        if (status !== 'playing' || !puzzle) return false;

        const moveAttempt = { from: sourceSquare, to: targetSquare, promotion: 'q' };

        try {
            const tempGame = new Chess(game.fen());
            const move = tempGame.move(moveAttempt);
            if (!move) return false;

            const expectedMove = puzzle.moves[solutionIndex];
            const playedMove = move.from + move.to + (move.promotion || '');

            if (playedMove === expectedMove) {
                const nextGame = new Chess(game.fen());
                nextGame.move(moveAttempt);
                setGame(nextGame);
                playMoveSound();

                const nextIndex = solutionIndex + 1;
                setSolutionIndex(nextIndex);

                if (nextIndex >= puzzle.moves.length) {
                    setStatus('solved');
                    playMoveSound();
                } else {
                    const timeoutId = window.setTimeout(() => {
                        const responseUci = puzzle.moves[nextIndex];
                        const from = responseUci.slice(0, 2);
                        const to = responseUci.slice(2, 4);
                        const promotion = responseUci.length > 4 ? responseUci[4] : undefined;
                        nextGame.move({ from, to, promotion });
                        setGame(new Chess(nextGame.fen()));
                        playMoveSound();
                        setSolutionIndex(nextIndex + 1);

                        if (nextIndex + 1 >= puzzle.moves.length) {
                            setStatus('solved');
                        }
                    }, 500);
                    pendingTimeouts.current.push(timeoutId);
                }
                return true;
            }

            setStatus('failed');
            const timeoutId = window.setTimeout(() => setStatus('playing'), 1500);
            pendingTimeouts.current.push(timeoutId);
            return false;
        } catch (error) {
            // Invalid move, ignore
            return false;
        }
    };

    const onSquareClick = (square: Square) => {
        if (status !== 'playing') return;

        if (square === moveFrom) {
            setMoveFrom(null);
            setOptionSquares({});
            return;
        }

        if (moveFrom) {
            const success = handlePieceDrop(moveFrom, square);
            if (success) {
                setMoveFrom(null);
                setOptionSquares({});
                return;
            }
        }

        const piece = game.get(square);
        const myColor = orientation === 'white' ? 'w' : 'b';
        if (piece && piece.color === myColor) {
            setMoveFrom(square);
            getMoveOptions(square);
        } else {
            setMoveFrom(null);
            setOptionSquares({});
        }
    };

    const handleRetry = () => {
        if (!puzzle) {
            void fetchPuzzle();
            return;
        }
        initializePuzzleState(puzzle);
    };

    const handleShowSolution = () => {
        if (!puzzle) return;
        clearPendingTimeouts();
        const replayGame = createPuzzleGame(puzzle.fen);
        setStatus('playing');
        setSolutionIndex(0);
        setGame(new Chess(replayGame.fen()));

        puzzle.moves.forEach((moveUci, index) => {
            const timeoutId = window.setTimeout(() => {
                try {
                    const from = moveUci.slice(0, 2) as Square;
                    const to = moveUci.slice(2, 4) as Square;
                    const promotion = moveUci.length > 4 ? moveUci[4] : undefined;

                    const moves = replayGame.moves({ verbose: true });
                    const isValid = moves.some((m) => m.from === from && m.to === to);
                    if (!isValid) {
                        console.error('Invalid solution move', moveUci, replayGame.fen());
                        return;
                    }

                    replayGame.move({ from, to, promotion });
                    setGame(new Chess(replayGame.fen()));
                    setSolutionIndex(index + 1);
                    playMoveSound();

                    if (index === puzzle.moves.length - 1) {
                        setStatus('solved');
                    }
                } catch (error) {
                    console.error('[daily-puzzle-solution]', error);
                }
            }, 500 * (index + 1));
            pendingTimeouts.current.push(timeoutId);
        });
    };

    const handleOpenGame = async () => {
        if (!puzzle) return;

        try {
            setIsFetching(true);
            // 1. Extract Game ID
            // puzzle.gameUrl usually looks like https://lichess.org/xxxxx/black
            // We need to extract the ID 'xxxxx'
            const match = puzzle.gameUrl?.match(/lichess\.org\/([a-zA-Z0-9]{8,12})/);
            const gameId = match ? match[1] : puzzle.id;

            console.log('[DailyPuzzle] Fetching PGN for gameId:', gameId);

            // 2. Fetch PGN
            const res = await fetch(`https://lichess.org/game/export/${gameId}?clocks=false&evals=false&opening=false`);
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Failed to fetch game PGN: ${res.status} ${errText}`);
            }
            const pgn = await res.text();

            // 3. Open IndexedDB and save game
            const { openDB } = await import('idb');
            const db = await openDB('games', 1, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains('games')) {
                        db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
                    }
                },
            });

            const id = await db.add('games', {
                pgn,
                playerSide: orientation,
                origin: 'daily-puzzle',
                createdAt: Date.now(),
            });

            // 4. Navigate to analyze page
            window.open(`/analyze?gameId=${id}`, '_blank');
        } catch (error) {
            console.error('Failed to open game for analysis:', error);
            setFetchError('无法加载游戏数据，请稍后重试。');
        } finally {
            setIsFetching(false);
        }
    };

    const loading = status === 'loading';

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 0,
                overflow: 'hidden',
                borderRadius: 3,
                bgcolor: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    p: { xs: 2, md: 4 },
                    bgcolor: '#262626',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: { xs: 300, md: 500, lg: 600 },
                }}
            >
                <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: 800 }, aspectRatio: '1/1', position: 'relative' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Chessboard
                            options={{
                                position: game.fen(),
                                boardOrientation: orientation,
                                canDragPiece: ({ piece }: any) => {
                                    const pieceStr = typeof piece === 'string' ? piece : piece?.pieceType || '';
                                    const pieceColor = pieceStr[0];
                                    const myColor = orientation === 'white' ? 'w' : 'b';
                                    return status === 'playing' && pieceColor === myColor;
                                },
                                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                                    handlePieceDrop(sourceSquare as Square, targetSquare as Square),
                                onSquareClick: ({ square }) => onSquareClick(square as Square),
                                squareStyles: optionSquares,
                                animationDurationInMs: 200,
                            }}
                        />
                    )}
                </Box>
            </Box>

            <Box
                sx={{
                    width: { xs: '100%', md: 340 },
                    p: 3,
                    borderLeft: { md: '1px solid rgba(255,255,255,0.1)' },
                    borderTop: { xs: '1px solid rgba(255,255,255,0.1)', md: 'none' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
            >
                <Stack spacing={3}>
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                                <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
                                    Daily Puzzle
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Rating:{' '}
                                    <span style={{ color: '#fff', fontWeight: 600 }}>
                                        {puzzle ? puzzle.rating : '...'}
                                    </span>
                                </Typography>
                                {puzzle?.openingTags?.length ? (
                                    <Typography variant="caption" color="text.secondary">
                                        {puzzle.openingTags.join(', ')}
                                    </Typography>
                                ) : null}
                            </Box>
                            <Chip
                                label={orientation === 'white' ? 'White to Move' : 'Black to Move'}
                                size="small"
                                sx={{
                                    bgcolor: orientation === 'white' ? '#fff' : '#000',
                                    color: orientation === 'white' ? '#000' : '#fff',
                                    fontWeight: 600,
                                }}
                            />
                        </Stack>
                    </Box>

                    <Paper
                        sx={{
                            p: 2,
                            bgcolor:
                                status === 'playing'
                                    ? 'rgba(255,255,255,0.05)'
                                    : status === 'solved'
                                        ? 'rgba(46, 125, 50, 0.2)'
                                        : 'rgba(211, 47, 47, 0.2)',
                            border: '1px solid',
                            borderColor:
                                status === 'playing' ? 'rgba(255,255,255,0.1)' : status === 'solved' ? 'success.main' : 'error.main',
                            borderRadius: 2,
                        }}
                    >
                        <Stack direction="row" spacing={2} alignItems="center">
                            {status === 'playing' && (
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', boxShadow: '0 0 8px var(--mui-palette-primary-main)' }} />
                            )}
                            {status === 'solved' && <CheckCircleIcon color="success" />}
                            {status === 'failed' && <ErrorIcon color="error" />}

                            <Typography fontWeight={600}>
                                {status === 'playing' && 'Find the best move!'}
                                {status === 'solved' && 'Puzzle solved!'}
                                {status === 'failed' && 'Incorrect, try again.'}
                            </Typography>
                        </Stack>
                    </Paper>

                    {fetchError && (
                        <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
                            {fetchError}
                        </Alert>
                    )}

                    {puzzle && (
                        <Box>
                            <Button
                                size="small"
                                onClick={() => setShowThemes(!showThemes)}
                                sx={{
                                    textTransform: 'none',
                                    color: 'text.secondary',
                                    p: 0,
                                    minWidth: 0,
                                    mb: 1,
                                    '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
                                }}
                            >
                                {showThemes ? 'Hide Themes' : 'Show Themes'}
                            </Button>

                            {showThemes && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {puzzle.themes.map((theme) => (
                                        <Chip key={theme} label={theme} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                                    ))}
                                </Box>
                            )}
                        </Box>
                    )}
                </Stack>

                <Stack spacing={2} sx={{ mt: 4 }}>
                    {(status === 'failed' || status === 'solved') && (
                        <Button
                            variant="contained"
                            color="warning"
                            fullWidth
                            onClick={handleRetry}
                            startIcon={<RefreshIcon />}
                        >
                            {status === 'solved' ? 'Solve Again' : 'Retry Puzzle'}
                        </Button>
                    )}

                    {status === 'playing' && (
                        <Button
                            variant="outlined"
                            color="inherit"
                            fullWidth
                            onClick={handleShowSolution}
                            sx={{ borderColor: 'rgba(255,255,255,0.2)' }}
                        >
                            View Solution
                        </Button>
                    )}

                    <Button
                        variant="contained"
                        color="secondary"
                        fullWidth
                        onClick={() => fetchPuzzle()}
                        startIcon={<SkipNextIcon />}
                        disabled={isFetching}
                    >
                        {isFetching ? 'Loading...' : 'Next Puzzle'}
                    </Button>

                    {puzzle?.gameUrl && (
                        <Button variant="contained" color="primary" fullWidth onClick={handleOpenGame} startIcon={<InsightsIcon />}>
                            Analyze This Game
                        </Button>
                    )}

                    <Typography variant="caption" align="center" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Puzzle ID: {puzzle?.id}
                    </Typography>
                </Stack>
            </Box>
        </Paper>
    );
}
