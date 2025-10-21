'use client';

import { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { useStockfish } from '../hooks/useStockfish';

interface Position {
  from: string;
  to: string;
  promotion?: string;
}

export default function ChessBoard() {
  const [game, setGame] = useState<Chess | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const { isReady, analyze, analysis, info } = useStockfish();

  useEffect(() => {
    setGame(new Chess());
  }, []);

  // Auto-analyze position when game changes
  useEffect(() => {
    if (game && isReady) {
      analyze(game.fen(), 15);
    }
  }, [game, isReady, analyze]);

  const handleSquareClick = (square: string) => {
    if (!game) return;

    // If a square is already selected, try to make a move
    if (selectedSquare) {
      try {
        const move = game.moves({ square: selectedSquare as Square, verbose: true });
        const targetMove = move.find((m: any) => m.to === square);

        if (targetMove) {
          const newGame = new Chess(game.fen());
          newGame.move({
            from: selectedSquare,
            to: square,
            promotion: 'q',
          });
          setGame(newGame);
          setSelectedSquare(null);
          setValidMoves([]);
        } else {
          setSelectedSquare(square);
          updateValidMoves(square);
        }
      } catch (e) {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else {
      // Select a square
      setSelectedSquare(square);
      updateValidMoves(square);
    }
  };

  const updateValidMoves = (square: string) => {
    if (!game) return;
    const moves = game.moves({ square: square as Square, verbose: true });
    setValidMoves(moves.map((m: any) => m.to));
  };

  const renderBoard = () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    return (
      <div className="inline-block border-4 border-gray-800">
        {ranks.map((rank) =>
          files.map((file) => {
            const square = `${file}${rank}` as Square;
            const isLight = (file.charCodeAt(0) + rank.charCodeAt(0)) % 2 === 0;
            const isSelected = square === selectedSquare;
            const isValidMove = validMoves.includes(square);

            return (
              <button
                key={square}
                onClick={() => handleSquareClick(square)}
                className={`w-16 h-16 flex items-center justify-center text-4xl font-bold cursor-pointer transition-colors ${
                  isLight ? 'bg-amber-100' : 'bg-amber-700'
                } ${isSelected ? 'bg-yellow-400' : ''} ${
                  isValidMove ? 'ring-4 ring-green-400' : ''
                }`}
              >
                {game?.get(square) && getPieceSymbol(game.get(square))}
              </button>
            );
          })
        )}
      </div>
    );
  };

  const getPieceSymbol = (piece: any) => {
    const symbols: Record<string, string> = {
      p: '♟',
      n: '♞',
      b: '♝',
      r: '♜',
      q: '♛',
      k: '♚',
      P: '♙',
      N: '♘',
      B: '♗',
      R: '♖',
      Q: '♕',
      K: '♔',
    };
    return symbols[piece.type] || '';
  };

  const formatScore = (score: number) => {
    // Convert centipawns to pawns
    return (score / 100).toFixed(2);
  };

  const resetGame = () => {
    setGame(new Chess());
    setSelectedSquare(null);
    setValidMoves([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-4">Chess Analyzer</h1>
      <p className="mb-4 text-sm text-gray-600">
        {isReady ? '✓ Stockfish Ready' : '⟳ Loading Stockfish...'}
      </p>
      <div className="mb-8">
        {renderBoard()}
      </div>

      {/* Analysis Panel */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h2 className="text-xl font-bold mb-4">Analysis</h2>

        {info && (
          <div className="mb-4 pb-4 border-b">
            <p className="text-sm text-gray-600">
              Score: <span className="font-bold">{formatScore(info.score)}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Depth: {info.depth}
            </p>
          </div>
        )}

        {analysis && (
          <div>
            <p className="text-sm mb-2">
              Best Move: <span className="font-bold text-green-600">{analysis.bestMove}</span>
            </p>
            <p className="text-xs text-gray-600 break-words">
              Line: {analysis.pv}
            </p>
          </div>
        )}

        {!isReady && (
          <p className="text-sm text-gray-500">Initializing Stockfish...</p>
        )}
      </div>

      <button
        onClick={resetGame}
        className="mt-8 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
      >
        Reset Game
      </button>

      {game && (
        <div className="mt-8 text-center">
          <p className="text-lg">
            Status: {game.isCheckmate() ? 'Checkmate' : game.isDraw() ? 'Draw' : 'Playing'}
          </p>
          <p className="text-sm text-gray-600 mt-2">FEN: {game.fen()}</p>
        </div>
      )}
    </div>
  );
}
