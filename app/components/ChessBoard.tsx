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
  const [flipped, setFlipped] = useState(false);

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

    const displayFiles = flipped ? files.slice().reverse() : files;
    const displayRanks = flipped ? ranks.slice().reverse() : ranks;

    return (
      <div className="flex flex-col gap-1">
        {/* 文件标签 (顶部) */}
        <div className="flex gap-1">
          <div className="w-7"></div>
          {displayFiles.map((file) => (
            <div key={`file-top-${file}`} className="w-16 h-7 flex items-center justify-center text-xs font-bold text-gray-600">
              {file}
            </div>
          ))}
          <div className="w-7"></div>
        </div>

        {/* 棋盘 */}
        <div className="flex gap-1">
          {/* 左侧排名 */}
          <div className="flex flex-col gap-1">
            {displayRanks.map((rank) => (
              <div key={`rank-left-${rank}`} className="w-7 h-16 flex items-center justify-center text-xs font-bold text-gray-600">
                {rank}
              </div>
            ))}
          </div>

          {/* 棋盘主体 */}
          <div className="inline-block border-4 border-gray-800 gap-1">
            {displayRanks.map((rank) => (
              <div key={`rank-${rank}`} className="flex gap-1">
                {displayFiles.map((file) => {
                  const square = `${file}${rank}` as Square;
                  const isLight = (file.charCodeAt(0) + rank.charCodeAt(0)) % 2 === 0;
                  const isSelected = square === selectedSquare;
                  const isValidMove = validMoves.includes(square);

                  return (
                    <button
                      key={square}
                      onClick={() => handleSquareClick(square)}
                      className={`w-16 h-16 flex items-center justify-center text-4xl font-bold cursor-pointer transition-all border-2 ${
                        isLight ? 'bg-amber-100' : 'bg-amber-700'
                      } ${isSelected ? 'border-yellow-400 bg-yellow-300' : 'border-transparent'} ${
                        isValidMove ? 'ring-4 ring-inset ring-green-400' : ''
                      }`}
                      title={square}
                    >
                      {game?.get(square) && getPieceSymbol(game.get(square))}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 右侧排名 */}
          <div className="flex flex-col gap-1">
            {displayRanks.map((rank) => (
              <div key={`rank-right-${rank}`} className="w-7 h-16 flex items-center justify-center text-xs font-bold text-gray-600">
                {rank}
              </div>
            ))}
          </div>
        </div>

        {/* 文件标签 (底部) */}
        <div className="flex gap-1">
          <div className="w-7"></div>
          {displayFiles.map((file) => (
            <div key={`file-bottom-${file}`} className="w-16 h-7 flex items-center justify-center text-xs font-bold text-gray-600">
              {file}
            </div>
          ))}
          <div className="w-7"></div>
        </div>
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

  const getMoveHistory = () => {
    if (!game) return [];
    const history = game.history({ verbose: true });
    return history.map((move: any) => `${move.san}`);
  };

  const toggleFlipped = () => {
    setFlipped(!flipped);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <h1 className="text-5xl font-bold mb-2 text-gray-800">♔ Chess Analyzer</h1>
      <p className="mb-6 text-sm text-gray-600">
        {isReady ? '✓ Stockfish Ready' : '⟳ Loading Stockfish...'}
      </p>

      <div className="flex gap-8">
        {/* 左侧：棋盘 */}
        <div className="flex flex-col items-center gap-4">
          {renderBoard()}
          <div className="flex gap-2">
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
            >
              New Game
            </button>
            <button
              onClick={toggleFlipped}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-medium"
            >
              Flip Board
            </button>
          </div>
        </div>

        {/* 右侧：分析面板 */}
        <div className="w-80 flex flex-col gap-6">
          {/* 分析信息 */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Analysis</h2>

            {info && (
              <div className="mb-6 pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-600 mb-1">
                  Score: <span className="font-bold text-lg text-blue-600">{formatScore(info.score)}</span>
                </p>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, 50 + Number(info.score) / 10))}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Depth: {info.depth}
                </p>
              </div>
            )}

            {analysis && (
              <div className="mb-4">
                <p className="text-sm mb-2">
                  Best Move: <span className="font-bold text-lg text-green-600">{analysis.bestMove}</span>
                </p>
                <p className="text-xs text-gray-600 break-words bg-gray-50 p-2 rounded">
                  Line: {analysis.pv || 'analyzing...'}
                </p>
              </div>
            )}

            {!isReady && (
              <p className="text-sm text-gray-500 animate-pulse">Initializing Stockfish...</p>
            )}
          </div>

          {/* 游戏状态 */}
          {game && (
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold mb-3 text-gray-800">Game Status</h3>
              <p className="text-sm mb-2">
                <span className="text-gray-600">Status:</span>{' '}
                <span className="font-bold">
                  {game.isCheckmate()
                    ? '♟ Checkmate'
                    : game.isStalemate()
                      ? '♟ Stalemate'
                    : game.isDraw()
                      ? '♟ Draw'
                    : game.isCheck()
                      ? '⚠ Check'
                      : '⚽ Playing'}
                </span>
              </p>
              <p className="text-sm mb-2">
                <span className="text-gray-600">Turn:</span> <span className="font-bold">{game.turn() === 'w' ? 'White' : 'Black'}</span>
              </p>
              <p className="text-sm mb-3">
                <span className="text-gray-600">Moves:</span> <span className="font-bold">{game.moveNumber()}</span>
              </p>
              <details className="text-xs text-gray-600">
                <summary className="cursor-pointer font-semibold mb-2">FEN String</summary>
                <p className="bg-gray-50 p-2 rounded break-all font-mono">{game.fen()}</p>
              </details>
            </div>
          )}

          {/* 着法历史 */}
          {game && getMoveHistory().length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold mb-3 text-gray-800">Move History</h3>
              <div className="flex flex-wrap gap-2">
                {getMoveHistory().map((move, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">
                    {index + 1}. {move}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

