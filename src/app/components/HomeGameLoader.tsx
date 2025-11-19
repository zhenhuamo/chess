"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
	Box,
	Button,
	Divider,
	Stack,
	Tab,
	Tabs,
	TextField,
	Typography,
	Chip,
	MenuItem,
	FormControlLabel,
	Checkbox,
} from "@mui/material";
import { type LichessFetchOptions } from "@/src/lib/lichess";

type RemoteSource = "chesscom" | "lichess";
const LICHESS_PERF_OPTIONS = [
	{ value: "", label: "All time controls" },
	{ value: "ultraBullet", label: "Ultra Bullet" },
	{ value: "bullet", label: "Bullet" },
	{ value: "blitz", label: "Blitz" },
	{ value: "rapid", label: "Rapid" },
	{ value: "classical", label: "Classical" },
	{ value: "correspondence", label: "Correspondence" },
];
const LICHESS_MAX_OPTIONS = [50, 100, 200, 300];

export default function HomeGameLoader({
	onAnalyzePGN,
	onAnalyzeLocalPGN,
}: {
	// Called when a game (from Chess.com or Lichess) is picked
	onAnalyzePGN: (pgn: string, source?: RemoteSource) => void;
	// Called when user pastes PGN directly in this widget
	onAnalyzeLocalPGN?: (pgn: string) => void;
}) {
	const router = useRouter();
	const [tab, setTab] = useState(0); // 0: PGN, 1: Chess.com, 2: Lichess

	// PGN tab state
	const [pgn, setPgn] = useState("");
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	// Chess.com tab state
	const [username, setUsername] = useState("");
	const [chessFetched, setChessFetched] = useState(false);
	const [lastChessQuery, setLastChessQuery] = useState("");

	// Lichess tab state
	const [lichessUsername, setLichessUsername] = useState("");
	const [lichessPerf, setLichessPerf] = useState<
		LichessFetchOptions["perfType"] | ""
	>("");
	const [lichessRatedOnly, setLichessRatedOnly] = useState(false);
	const [lichessMaxGames, setLichessMaxGames] = useState(50);
	const [lichessFetched, setLichessFetched] = useState(false);
	const [lastLichessQuery, setLastLichessQuery] = useState("");

	const fetchChessComGames = () => {
		const target = username.trim();
		if (!target) {
			setChessFetched(false);
			setLastChessQuery("");
			return;
		}

		router.push(
			`/import?source=chesscom&username=${encodeURIComponent(target)}`,
		);
	};

	const formatPerfLabel = (perf?: string) => {
		if (!perf) return "";
		return (
			LICHESS_PERF_OPTIONS.find((opt) => opt.value === perf)?.label || perf
		);
	};

	const fetchLichessGames = () => {
		const target = lichessUsername.trim();
		if (!target) {
			setLichessFetched(false);
			setLastLichessQuery("");
			return;
		}

		setLichessFetched(true);
		setLastLichessQuery(target);
		const options: LichessFetchOptions = {
			perfType: (lichessPerf as LichessFetchOptions["perfType"]) || undefined,
			ratedOnly: lichessRatedOnly ? true : undefined,
			max: lichessMaxGames,
			includeOpening: true,
		};
		const params = new URLSearchParams({
			source: "lichess",
			username: target,
			...(options.perfType ? { perf: options.perfType } : {}),
			...(options.ratedOnly ? { rated: "1" } : {}),
			...(options.max ? { max: String(options.max) } : {}),
		});
		router.push(`/import?${params.toString()}`);
	};

	return (
		<Box>
			<Tabs
				value={tab}
				onChange={(_, v) => setTab(v)}
				aria-label="load game tabs"
				sx={{ minHeight: 0 }}
			>
				<Tab label="PGN" sx={{ textTransform: "none", minHeight: 34 }} />
				<Tab label="Chess.com" sx={{ textTransform: "none", minHeight: 34 }} />
				<Tab label="Lichess" sx={{ textTransform: "none", minHeight: 34 }} />
			</Tabs>
			<Divider sx={{ mb: 2 }} />

			{/* PGN tab */}
			{tab === 0 && (
				<Stack spacing={1.5}>
					<TextField
						multiline
						minRows={4}
						value={pgn}
						onChange={(e) => setPgn(e.target.value)}
						placeholder={"Paste a single PGN here..."}
						fullWidth
					/>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
						<Button
							variant="contained"
							onClick={() =>
								pgn.trim() && (onAnalyzeLocalPGN ?? onAnalyzePGN)(pgn)
							}
							disabled={!pgn.trim()}
						>
							Analyze PGN
						</Button>
						<Button
							variant="outlined"
							onClick={() => fileInputRef.current?.click()}
						>
							Upload from file
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept=".pgn,.txt,application/x-chess-pgn,text/plain"
							style={{ display: "none" }}
							onChange={async (e) => {
								const file = e.target.files?.[0];
								if (!file) return;
								try {
									if (file.size > 2 * 1024 * 1024) {
										alert(
											"File is too large (>2MB). Please upload a smaller PGN.",
										);
										return;
									}
									const text = await file.text();
									setPgn(text);
								} catch {
									alert("Failed to read PGN file. Please try again.");
								} finally {
									if (e.target) e.target.value = "";
								}
							}}
						/>
					</Stack>
				</Stack>
			)}

			{/* Chess.com tab */}
			{tab === 1 && (
				<Stack spacing={1.5}>
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={1.5}
						alignItems={{ sm: "center" }}
					>
						<TextField
							label="Chess.com username"
							placeholder="e.g. hikaru"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									fetchChessComGames();
								}
							}}
							size="small"
							fullWidth
						/>
						<Button
							variant="contained"
							onClick={fetchChessComGames}
							disabled={!username.trim()}
							sx={{ minWidth: 140 }}
						>
							Fetch games
						</Button>
					</Stack>
					{chessFetched && lastChessQuery && (
						<Typography variant="body2" color="text.secondary">
							Results will open on the import page.
						</Typography>
					)}
				</Stack>
			)}

			{/* Lichess tab */}
			{tab === 2 && (
				<Stack spacing={1.5}>
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={1.5}
						alignItems={{ sm: "center" }}
					>
						<TextField
							label="Lichess username"
							placeholder="e.g. magnuscarlsen"
							value={lichessUsername}
							onChange={(e) => setLichessUsername(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									fetchLichessGames();
								}
							}}
							size="small"
							fullWidth
						/>
						<Button
							variant="contained"
							onClick={fetchLichessGames}
							disabled={!lichessUsername.trim()}
							sx={{ minWidth: 140 }}
						>
							Fetch games
						</Button>
					</Stack>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
						<TextField
							select
							label="Time control"
							value={lichessPerf}
							onChange={(e) =>
								setLichessPerf(
									(e.target.value as LichessFetchOptions["perfType"]) || "",
								)
							}
							size="small"
							fullWidth
						>
							{LICHESS_PERF_OPTIONS.map((opt) => (
								<MenuItem key={opt.value || "all"} value={opt.value}>
									{opt.label}
								</MenuItem>
							))}
						</TextField>
						<TextField
							select
							label="Result count"
							value={lichessMaxGames}
							onChange={(e) => setLichessMaxGames(Number(e.target.value))}
							size="small"
							fullWidth
						>
							{LICHESS_MAX_OPTIONS.map((option) => (
								<MenuItem key={option} value={option}>
									Last {option} games
								</MenuItem>
							))}
						</TextField>
					</Stack>
					<FormControlLabel
						control={
							<Checkbox
								size="small"
								checked={lichessRatedOnly}
								onChange={(e) => setLichessRatedOnly(e.target.checked)}
							/>
						}
						label="Show rated games only"
					/>
					{lichessFetched && lastLichessQuery && (
						<Typography variant="body2" color="text.secondary">
							Results will open on the import page.
						</Typography>
					)}
				</Stack>
			)}
		</Box>
	);
}
