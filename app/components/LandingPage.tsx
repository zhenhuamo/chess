'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [analysisInput, setAnalysisInput] = useState('');
  const [analysisType, setAnalysisType] = useState('pgn');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Animated background */}
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
                Guides
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-300"></div>
              </button>
              <Link
                href="/game"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-semibold transition transform hover:scale-105 shadow-lg hover:shadow-blue-500/50"
              >
                Play
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Tool First */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Analysis Tool */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
                  Analyze Chess Games Instantly
                </h1>
                <p className="text-lg text-slate-300">
                  Upload PGN files, paste FEN positions, or play against Stockfish AI. Get instant analysis and improve your chess game.
                </p>
              </div>

              {/* Analysis Tool Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-blue-500/30 rounded-2xl p-8 overflow-hidden">
                <div className="space-y-4">
                  {/* Tabs */}
                  <div className="flex gap-4 border-b border-slate-700">
                    <button
                      onClick={() => setAnalysisType('pgn')}
                      className={`pb-3 px-4 font-semibold transition ${
                        analysisType === 'pgn'
                          ? 'text-blue-400 border-b-2 border-blue-500'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      📚 PGN/Game
                    </button>
                    <button
                      onClick={() => setAnalysisType('fen')}
                      className={`pb-3 px-4 font-semibold transition ${
                        analysisType === 'fen'
                          ? 'text-blue-400 border-b-2 border-blue-500'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      🔬 FEN Position
                    </button>
                    <Link
                      href="/game?mode=practice"
                      className="pb-3 px-4 font-semibold text-slate-400 hover:text-slate-300 transition"
                    >
                      🎮 Play vs AI
                    </Link>
                  </div>

                  {/* Input Area */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-300">
                      {analysisType === 'pgn' ? 'Paste PGN or upload file' : 'Paste FEN position'}
                    </label>
                    <textarea
                      value={analysisInput}
                      onChange={(e) => setAnalysisInput(e.target.value)}
                      placeholder={
                        analysisType === 'pgn'
                          ? '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6...'
                          : 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
                      }
                      className="w-full h-40 bg-slate-800/50 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                    <div className="flex gap-3">
                      <button
                        disabled={!analysisInput.trim()}
                        className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50 text-white font-bold rounded-lg transition transform hover:scale-105 shadow-lg"
                      >
                        Analyze {analysisType === 'pgn' ? 'Game' : 'Position'}
                      </button>
                      <button className="px-6 py-3 border-2 border-blue-500 hover:bg-blue-500/10 text-blue-400 font-semibold rounded-lg transition">
                        Upload File
                      </button>
                    </div>
                  </div>

                  {/* Quick Examples */}
                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">Quick examples:</p>
                    <div className="flex flex-wrap gap-2">
                      <button className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition">
                        Try Beginner Game
                      </button>
                      <button className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition">
                        Try Expert Match
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Features */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/60 transition">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-bold text-white mb-2">Instant Analysis</h3>
              <p className="text-sm text-slate-400">Get real-time position evaluation and move recommendations</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6 hover:border-green-500/60 transition">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-bold text-white mb-2">Best Moves</h3>
              <p className="text-sm text-slate-400">See the strongest continuations suggested by Stockfish</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-bold text-white mb-2">Deep Insights</h3>
              <p className="text-sm text-slate-400">Understand every move with comprehensive analysis</p>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-500/60 transition">
              <div className="text-3xl mb-3">🆓</div>
              <h3 className="text-lg font-bold text-white mb-2">Completely Free</h3>
              <p className="text-sm text-slate-400">No sign-up required, no subscriptions, no ads</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-700/50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-slate-400">Three simple steps to analyze your chess games</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
              1
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Paste Your Game</h3>
            <p className="text-slate-400">Paste PGN notation or FEN positions directly into the tool</p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
              2
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Get Instant Analysis</h3>
            <p className="text-slate-400">Stockfish evaluates every position and shows best moves</p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
              3
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Learn & Improve</h3>
            <p className="text-slate-400">Review tactics and understand your mistakes</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-slate-800/30 border-y border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Frequently Asked Questions</h2>

          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-2">Is Chess Analyzer really free?</h3>
              <p className="text-slate-400">Yes, completely free. No subscriptions, no ads, no hidden costs. All analysis runs in your browser.</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-2">Do I need an account?</h3>
              <p className="text-slate-400">No account required. Start analyzing immediately without any registration or login.</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-2">How accurate is Stockfish?</h3>
              <p className="text-slate-400">Stockfish is one of the world's strongest chess engines. It provides grandmaster-level analysis.</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-2">Can I use this offline?</h3>
              <p className="text-slate-400">Yes! After the first load, all computation happens locally on your device. No internet required.</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-2">What file formats are supported?</h3>
              <p className="text-slate-400">We support PGN (standard chess notation), FEN (position codes), and direct game input.</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-2">Is my privacy protected?</h3>
              <p className="text-slate-400">All data stays on your device. We don't collect, store, or send any game information to our servers.</p>
            </div>
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
