'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* 动画背景效果 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-md border-b border-blue-500/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="text-3xl transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">♔</div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Chess Analyzer
              </h1>
            </div>
            <div className="flex gap-4">
              <button className="px-4 py-2 text-slate-300 hover:text-blue-300 transition relative group">
                How to Play
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-300"></div>
              </button>
              <Link
                href="/game"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-semibold transition transform hover:scale-105 shadow-lg hover:shadow-blue-500/50"
              >
                Start Game
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-5xl md:text-7xl font-bold text-white leading-tight">
                Master Chess with{' '}
                <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-pulse">
                  Stockfish AI
                </span>
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                Real-time position analysis, move suggestions, and evaluation. Learn from the world's strongest chess engine, completely free.
              </p>
            </div>

            <div className="flex gap-4 flex-wrap">
              <Link
                href="/game"
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl text-lg transition transform hover:scale-110 shadow-xl hover:shadow-blue-500/50"
              >
                <span className="flex items-center gap-2">
                  🎮 Play Now
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </Link>
              <button className="px-8 py-4 border-2 border-blue-500 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 font-bold rounded-xl text-lg transition relative overflow-hidden group">
                <span className="relative z-10">📚 Learn More</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
              </button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="group bg-gradient-to-br from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 p-4 rounded-lg border border-blue-500/30 hover:border-blue-500/60 transition cursor-pointer">
                <div className="text-2xl mb-2 transform group-hover:scale-125 transition-transform">⚡</div>
                <div className="text-sm font-semibold text-white">Real-Time Analysis</div>
                <div className="text-xs text-slate-400 mt-1">Instant evaluation</div>
              </div>
              <div className="group bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 p-4 rounded-lg border border-purple-500/30 hover:border-purple-500/60 transition cursor-pointer">
                <div className="text-2xl mb-2 transform group-hover:scale-125 transition-transform">🎯</div>
                <div className="text-sm font-semibold text-white">Best Moves</div>
                <div className="text-xs text-slate-400 mt-1">AI recommendations</div>
              </div>
              <div className="group bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 p-4 rounded-lg border border-cyan-500/30 hover:border-cyan-500/60 transition cursor-pointer">
                <div className="text-2xl mb-2 transform group-hover:scale-125 transition-transform">📊</div>
                <div className="text-sm font-semibold text-white">Position Score</div>
                <div className="text-xs text-slate-400 mt-1">Visual evaluation</div>
              </div>
              <div className="group bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 p-4 rounded-lg border border-green-500/30 hover:border-green-500/60 transition cursor-pointer">
                <div className="text-2xl mb-2 transform group-hover:scale-125 transition-transform">🆓</div>
                <div className="text-sm font-semibold text-white">Completely Free</div>
                <div className="text-xs text-slate-400 mt-1">No subscription</div>
              </div>
            </div>
          </div>

          {/* Right Side - Game Preview */}
          <div className="hidden md:flex justify-center">
            <div className="relative group">
              {/* Decorative Chessboard */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative w-80 h-80 bg-gradient-to-br from-amber-200 to-amber-800 rounded-xl p-3 shadow-2xl transform group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-slate-950 to-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
                  <div className="text-6xl animate-bounce" style={{animationDuration: '3s'}}>
                    ♔ ♕ ♖ ♗ ♘ ♙
                  </div>
                </div>
              </div>
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-blue-500/50 transform group-hover:scale-110 transition-transform">
                Zero Cost 🎉
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Game Modes Section */}
      <section className="bg-gradient-to-br from-slate-800/30 via-blue-900/20 to-slate-800/30 border-y border-blue-500/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Choose Your Style</h2>
            <p className="text-slate-300 text-lg">Play your way with different game modes</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Analysis Mode */}
            <Link href="/game?mode=analysis">
              <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-blue-500/30 hover:border-blue-500 rounded-2xl p-8 cursor-pointer transition transform hover:scale-105 h-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="text-5xl mb-4 transform group-hover:scale-125 transition-transform">🔬</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Position Analysis</h3>
                  <p className="text-slate-300 mb-4">Paste any FEN position and get instant AI analysis with move recommendations</p>
                  <div className="flex items-center gap-2 text-blue-400 font-semibold group-hover:text-blue-300">
                    Start Analyzing <span className="transform group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Practice Mode */}
            <Link href="/game?mode=practice">
              <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-green-500/30 hover:border-green-500 rounded-2xl p-8 cursor-pointer transition transform hover:scale-105 h-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600/0 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="text-5xl mb-4 transform group-hover:scale-125 transition-transform">🎓</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Practice Mode</h3>
                  <p className="text-slate-300 mb-4">Play move-by-move with the AI analyzing your every decision in real-time</p>
                  <div className="flex items-center gap-2 text-green-400 font-semibold group-hover:text-green-300">
                    Start Practicing <span className="transform group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Study Mode */}
            <Link href="/game?mode=study">
              <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-purple-500/30 hover:border-purple-500 rounded-2xl p-8 cursor-pointer transition transform hover:scale-105 h-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="text-5xl mb-4 transform group-hover:scale-125 transition-transform">📚</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Study Mode</h3>
                  <p className="text-slate-300 mb-4">Import PGN files or recreate famous games to analyze and learn from grandmasters</p>
                  <div className="flex items-center gap-2 text-purple-400 font-semibold group-hover:text-purple-300">
                    Start Studying <span className="transform group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Powerful Features</h2>
          <p className="text-slate-300 text-lg">Everything you need to improve your chess</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition">
            <div className="text-4xl mb-4">💡</div>
            <h3 className="text-xl font-bold text-white mb-2">Smart Evaluation</h3>
            <p className="text-slate-400">Real-time position evaluation with visual progress bars showing who's winning</p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-green-500 transition">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-2">Best Move Suggestions</h3>
            <p className="text-slate-400">Get AI recommendations for the best moves in any position</p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-purple-500 transition">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Move History</h3>
            <p className="text-slate-400">Full game notation and move-by-move breakdown for deep analysis</p>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-yellow-500 transition">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-xl font-bold text-white mb-2">Flip Board</h3>
            <p className="text-slate-400">View the board from any perspective - white or black side</p>
          </div>

          {/* Feature 5 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-pink-500 transition">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-xl font-bold text-white mb-2">Board Coordinates</h3>
            <p className="text-slate-400">Clear a-h and 1-8 labels for professional-style chess analysis</p>
          </div>

          {/* Feature 6 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-cyan-500 transition">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-xl font-bold text-white mb-2">Customizable</h3>
            <p className="text-slate-400">Adjust analysis depth, board appearance, and more to your preference</p>
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section className="bg-slate-800/50 border-y border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">How to Get Started</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Click "Play Now"</h3>
              <p className="text-slate-400">Start a new game or load a position</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Make Your Moves</h3>
              <p className="text-slate-400">Click to select, drag or click target square</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Get Analysis</h3>
              <p className="text-slate-400">AI analyzes instantly, shows best moves</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                4
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Improve</h3>
              <p className="text-slate-400">Learn from Stockfish, master the game</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">❓ Is it really free?</h3>
            <p className="text-slate-400">Yes! Completely free with no ads or hidden costs. All computation happens in your browser.</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">❓ Do I need an account?</h3>
            <p className="text-slate-400">Nope! Just open the app and start playing. No registration or login required.</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">❓ How strong is Stockfish?</h3>
            <p className="text-slate-400">Stockfish is one of the strongest chess engines in the world. Great for learning and analysis.</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">❓ Can I play offline?</h3>
            <p className="text-slate-400">After the first load, the app works offline! Everything runs locally on your device.</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">❓ What about my privacy?</h3>
            <p className="text-slate-400">Your data never leaves your device. We don't collect or store any information about your games.</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">❓ How do I import a PGN?</h3>
            <p className="text-slate-400">In Study Mode, you can paste PGN notation to recreate and analyze any game.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 border-t border-blue-500/30 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68_68_68/.2)_25%,rgba(68_68_68/.2)_50%,transparent_50%,transparent_75%,rgba(68_68_68/.2)_75%,rgba(68_68_68/.2))] bg-[length:60px_60px]"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Analyze Like a Pro?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Start analyzing chess positions with Stockfish AI. Learn, practice, and master the game—completely free.
          </p>
          <Link
            href="/game"
            className="group inline-block px-10 py-4 bg-white text-blue-600 font-bold rounded-xl text-lg hover:bg-slate-100 transition transform hover:scale-110 shadow-xl hover:shadow-white/50"
          >
            <span className="flex items-center gap-2">
              🎮 Start Playing Now
              <span className="transform group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-t border-blue-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="group">
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                <span className="text-xl group-hover:rotate-12 transition-transform">♔</span>
                Chess Analyzer
              </h4>
              <p className="text-slate-400 text-sm">Free, open-source chess analysis with Stockfish AI</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Features</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-blue-400 transition">Position Analysis</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Move Suggestions</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Game Study</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-blue-400 transition">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Tutorials</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-blue-400 transition">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Terms</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">License</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center">
            <p className="text-slate-400 text-sm">© 2024 Chess Analyzer. Powered by Stockfish. Open source & completely free.</p>
            <p className="text-slate-500 text-xs mt-2">Built with Next.js, React, and TypeScript</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
