"use client";
export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Container,
	Divider,
	FormControlLabel,
	IconButton,
	MenuItem,
	Pagination,
	Paper,
	Select,
	Stack,
	TextField,
	Tooltip,
	Typography,
	Checkbox,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import { getChessComUserRecentGames } from "@/src/lib/chessCom";
import {
	getLichessUserRecentGames,
	type LichessFetchOptions,
} from "@/src/lib/lichess";
import { LoadedGame } from "@/types/game";
import { formatGameToDatabase } from "@/src/lib/chess";
import { Chess } from "chess.js";

const LICHESS_PERF_OPTIONS = [
	{ value: "", label: "All time controls" },
	{ value: "ultraBullet", label: "Ultra Bullet" },
	{ value: "bullet", label: "Bullet" },
	{ value: "blitz", label: "Blitz" },
	{ value: "rapid", label: "Rapid" },
	{ value: "classical", label: "Classical" },
	{ value: "correspondence", label: "Correspondence" },
];

const CHESS_PERF_OPTIONS = [
	{ value: "", label: "All time controls" },
	{ value: "bullet", label: "Bullet" },
	{ value: "blitz", label: "Blitz" },
	{ value: "rapid", label: "Rapid" },
	{ value: "classical", label: "Classical" },
];

const MAX_PER_PAGE_OPTIONS = [10, 25, 50];

const categorizeTimeControl = (tc?: string) => {
	if (!tc) return "";
	const [base] = tc.split("+");
	const seconds = Number(base);
	if (Number.isNaN(seconds)) return "";
	if (seconds <= 120) return "bullet";
	if (seconds <= 600) return "blitz";
	if (seconds <= 1800) return "rapid";
	return "classical";
};

const parseDateValue = (value?: string | null) =>
	value ? new Date(value).toISOString().slice(0, 10) : "";

const toTimestamp = (value?: string) => (value ? Date.parse(value) : undefined);

function ImportPageContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const source = (searchParams.get("source") || "chesscom").toLowerCase();
	const username = searchParams.get("username") || "";
	const perfParam = searchParams.get("perf") || "";
	const ratedParam = searchParams.get("rated");
	const maxParam = Number(searchParams.get("max") || "50");
	const sinceParam = parseDateValue(searchParams.get("since"));
	const untilParam = parseDateValue(searchParams.get("until"));

	const [rawGames, setRawGames] = useState<LoadedGame[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(25);

	const [chessUsername, setChessUsername] = useState(username);
	const [chessPerf, setChessPerf] = useState(
		source === "chesscom" ? perfParam : "",
	);
	const [chessRatedOnly, setChessRatedOnly] = useState(
		source === "chesscom" && ratedParam === "1",
	);
	const [chessSince, setChessSince] = useState(
		source === "chesscom" ? sinceParam : "",
	);
	const [chessUntil, setChessUntil] = useState(
		source === "chesscom" ? untilParam : "",
	);

	const [lichessUsername, setLichessUsername] = useState(username);
	const [lichessPerf, setLichessPerf] = useState<
		LichessFetchOptions["perfType"] | ""
	>(
		source === "lichess"
			? (perfParam as LichessFetchOptions["perfType"]) || ""
			: "",
	);
	const [lichessRatedOnly, setLichessRatedOnly] = useState(
		source === "lichess" && ratedParam === "1",
	);
	const [lichessMax, setLichessMax] = useState(
		Math.min(Math.max(maxParam || 50, 10), 300),
	);
	const [lichessSince, setLichessSince] = useState(
		source === "lichess" ? sinceParam : "",
	);
	const [lichessUntil, setLichessUntil] = useState(
		source === "lichess" ? untilParam : "",
	);

	const fetchGames = useCallback(async () => {
		if (!username) {
			setRawGames([]);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			let games: LoadedGame[] = [];
			if (source === "lichess") {
				const options: LichessFetchOptions = {
					perfType:
						(lichessPerf as LichessFetchOptions["perfType"]) || undefined,
					ratedOnly: lichessRatedOnly ? true : undefined,
					max: lichessMax,
					since: toTimestamp(lichessSince),
					until: toTimestamp(lichessUntil),
					includeOpening: true,
				};
				games = await getLichessUserRecentGames(username, options);
			} else {
				games = await getChessComUserRecentGames(username);
			}
			setRawGames(games);
			setPage(1);
		} catch (err: any) {
			setRawGames([]);
			setError(err?.message || "Failed to fetch games");
		} finally {
			setLoading(false);
		}
	}, [
		username,
		source,
		lichessPerf,
		lichessRatedOnly,
		lichessMax,
		lichessSince,
		lichessUntil,
	]);

	useEffect(() => {
		if (username) {
			fetchGames();
		} else {
			setRawGames([]);
		}
	}, [fetchGames, username]);

	const filteredGames = useMemo(() => {
		if (source === "lichess") {
			return rawGames.filter((game) => {
				if (lichessPerf && game.perfType !== lichessPerf) return false;
				if (lichessRatedOnly && !game.isRated) return false;
				const ts = game.timestamp;
				const since = toTimestamp(lichessSince);
				const until = toTimestamp(lichessUntil);
				if (since && ts && ts < since) return false;
				if (until && ts && ts > until) return false;
				return true;
			});
		}

		return rawGames.filter((game) => {
			if (chessPerf) {
				const cat = categorizeTimeControl(game.timeControl);
				if (cat !== chessPerf) return false;
			}
			if (chessRatedOnly && !game.isRated) return false;
			const ts = game.timestamp;
			const since = toTimestamp(chessSince);
			const until = toTimestamp(chessUntil);
			if (since && ts && ts < since) return false;
			if (until && ts && ts > until) return false;
			return true;
		});
	}, [
		rawGames,
		source,
		lichessPerf,
		lichessRatedOnly,
		lichessSince,
		lichessUntil,
		chessPerf,
		chessRatedOnly,
		chessSince,
		chessUntil,
	]);

	const totalPages = Math.max(1, Math.ceil(filteredGames.length / perPage));
	const pageGames = useMemo(() => {
		const start = (page - 1) * perPage;
		return filteredGames.slice(start, start + perPage);
	}, [filteredGames, page, perPage]);

	const handleBack = () => router.push("/");

	const handleAnalyzerOpen = async (game: LoadedGame) => {
		if (!game.pgn) return;
		try {
			const chess = new Chess();
			chess.loadPgn(game.pgn);
			const { openDB } = await import("idb");
			const db = await openDB("games", 1, {
				upgrade(db) {
					if (!db.objectStoreNames.contains("games")) {
						db.createObjectStore("games", {
							keyPath: "id",
							autoIncrement: true,
						});
					}
				},
			});
			const rec: any = {
				...(formatGameToDatabase(chess) as any),
				origin: source,
			};
			const id = (await db.add("games", rec)) as unknown as number;
			router.push(`/analyze?gameId=${id}`);
		} catch (err) {
			console.error(err);
		}
	};

	const handleFilterSubmit = () => {
		const params = new URLSearchParams();
		params.set("source", source);
		const target =
			source === "lichess" ? lichessUsername.trim() : chessUsername.trim();
		if (target) params.set("username", target);
		if (source === "lichess") {
			if (lichessPerf) params.set("perf", lichessPerf);
			if (lichessRatedOnly) params.set("rated", "1");
			if (lichessSince) params.set("since", lichessSince);
			if (lichessUntil) params.set("until", lichessUntil);
			params.set("max", String(lichessMax));
		} else {
			if (chessPerf) params.set("perf", chessPerf);
			if (chessRatedOnly) params.set("rated", "1");
			if (chessSince) params.set("since", chessSince);
			if (chessUntil) params.set("until", chessUntil);
		}
		router.push(`/import?${params.toString()}`);
	};

	const handleRefresh = () => {
		if (username) fetchGames();
	};

	const filterSummary = useMemo(() => {
		const chips: string[] = [];
		if (username) chips.push(`User: ${username}`);
		if (source === "lichess") {
			if (lichessPerf) chips.push(`Time: ${lichessPerf}`);
			if (lichessRatedOnly) chips.push("Rated only");
			if (lichessSince) chips.push(`Since ${lichessSince}`);
			if (lichessUntil) chips.push(`Until ${lichessUntil}`);
			chips.push(`Max ${lichessMax}`);
		} else {
			if (chessPerf) chips.push(`Time: ${chessPerf}`);
			if (chessRatedOnly) chips.push("Rated only");
			if (chessSince) chips.push(`Since ${chessSince}`);
			if (chessUntil) chips.push(`Until ${chessUntil}`);
		}
		return chips;
	}, [
		username,
		source,
		lichessPerf,
		lichessRatedOnly,
		lichessSince,
		lichessUntil,
		lichessMax,
		chessPerf,
		chessRatedOnly,
		chessSince,
		chessUntil,
	]);

	const emptyMessage =
		rawGames.length === 0
			? username
				? "No games found. Try different filters."
				: "Enter a username to load games."
			: "No games match the current filters.";

	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			<Stack spacing={2}>
				<Stack direction="row" spacing={1} alignItems="center">
					<IconButton onClick={handleBack} aria-label="Back">
						<ArrowBackIcon />
					</IconButton>
					<Typography variant="h5">Import recent games</Typography>
					<Chip
						label={source === "lichess" ? "Lichess" : "Chess.com"}
						color="primary"
					/>
					{username && <Chip label={`User: ${username}`} variant="outlined" />}
				</Stack>

				<Paper variant="outlined" sx={{ p: 3 }}>
					<Stack spacing={2}>
						<Typography variant="subtitle2" color="text.secondary">
							Search parameters
						</Typography>
						{source === "chesscom" ? (
							<Stack spacing={1.5}>
								<Stack
									direction={{ xs: "column", sm: "row" }}
									spacing={1.5}
									alignItems={{ sm: "center" }}
								>
									<TextField
										label="Chess.com username"
										placeholder="e.g. hikaru"
										value={chessUsername}
										onChange={(e) => setChessUsername(e.target.value)}
										size="small"
										fullWidth
									/>
									<Button
										variant="contained"
										onClick={handleFilterSubmit}
										disabled={!chessUsername.trim()}
									>
										Load games
									</Button>
								</Stack>
								<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
									<TextField
										select
										label="Time control"
										value={chessPerf}
										onChange={(e) => setChessPerf(e.target.value)}
										size="small"
										fullWidth
									>
										{CHESS_PERF_OPTIONS.map((opt) => (
											<MenuItem key={opt.value || "all"} value={opt.value}>
												{opt.label}
											</MenuItem>
										))}
									</TextField>
									<FormControlLabel
										control={
											<Checkbox
												checked={chessRatedOnly}
												onChange={(e) => setChessRatedOnly(e.target.checked)}
												size="small"
											/>
										}
										label="Show rated games only"
									/>
								</Stack>
								<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
									<TextField
										label="Since"
										type="date"
										value={chessSince}
										onChange={(e) => setChessSince(e.target.value)}
										size="small"
										placeholder="YYYY-MM-DD"
										InputLabelProps={{ shrink: true }}
										inputProps={{ lang: "en" }}
										fullWidth
									/>
									<TextField
										label="Until"
										type="date"
										value={chessUntil}
										onChange={(e) => setChessUntil(e.target.value)}
										size="small"
										placeholder="YYYY-MM-DD"
										InputLabelProps={{ shrink: true }}
										inputProps={{ lang: "en" }}
										fullWidth
									/>
								</Stack>
							</Stack>
						) : (
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
										size="small"
										fullWidth
									/>
									<Button
										variant="contained"
										onClick={handleFilterSubmit}
										disabled={!lichessUsername.trim()}
									>
										Load games
									</Button>
								</Stack>
								<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
									<TextField
										select
										label="Time control"
										value={lichessPerf}
										onChange={(e) =>
											setLichessPerf(
												(e.target.value as LichessFetchOptions["perfType"]) ||
													"",
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
										label="Max games"
										value={lichessMax}
										onChange={(e) => setLichessMax(Number(e.target.value))}
										size="small"
										fullWidth
									>
										{[50, 100, 200, 300].map((option) => (
											<MenuItem key={option} value={option}>
												Last {option}
											</MenuItem>
										))}
									</TextField>
								</Stack>
								<FormControlLabel
									control={
										<Checkbox
											checked={lichessRatedOnly}
											onChange={(e) => setLichessRatedOnly(e.target.checked)}
											size="small"
										/>
									}
									label="Show rated games only"
								/>
								<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
									<TextField
										label="Since"
										type="date"
										value={lichessSince}
										onChange={(e) => setLichessSince(e.target.value)}
										size="small"
										placeholder="YYYY-MM-DD"
										InputLabelProps={{ shrink: true }}
										inputProps={{ lang: "en" }}
										fullWidth
									/>
									<TextField
										label="Until"
										type="date"
										value={lichessUntil}
										onChange={(e) => setLichessUntil(e.target.value)}
										size="small"
										placeholder="YYYY-MM-DD"
										InputLabelProps={{ shrink: true }}
										inputProps={{ lang: "en" }}
										fullWidth
									/>
								</Stack>
							</Stack>
						)}
					</Stack>
				</Paper>

				<Paper variant="outlined" sx={{ p: 3 }}>
					{filterSummary.length > 0 && (
						<Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
							{filterSummary.map((chip) => (
								<Chip key={chip} label={chip} size="small" />
							))}
						</Stack>
					)}
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={1.5}
						justifyContent="space-between"
						alignItems={{ sm: "center" }}
					>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="subtitle1">
								{loading
									? "Fetching games..."
									: `${filteredGames.length} games shown`}
							</Typography>
							{error && (
								<Typography variant="body2" color="error">
									{error}
								</Typography>
							)}
						</Stack>
						<Stack direction="row" spacing={1}>
							<Tooltip title="Refresh">
								<span>
									<IconButton onClick={handleRefresh} disabled={!username}>
										<RefreshIcon />
									</IconButton>
								</span>
							</Tooltip>
							<Tooltip title="Change filters">
								<span>
									<IconButton
										onClick={() =>
											window.scrollTo({ top: 0, behavior: "smooth" })
										}
									>
										<FilterListIcon />
									</IconButton>
								</span>
							</Tooltip>
						</Stack>
					</Stack>
					<Divider sx={{ my: 2 }} />
					{loading ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
							<CircularProgress />
						</Box>
					) : filteredGames.length === 0 ? (
						<Box sx={{ py: 4, textAlign: "center" }}>
							<Typography variant="body2" color="text.secondary">
								{emptyMessage}
							</Typography>
						</Box>
					) : (
						<Stack spacing={2}>
							{pageGames.map((game) => (
								<Paper key={game.id} variant="outlined" sx={{ p: 2 }}>
									<Stack
										direction={{ xs: "column", md: "row" }}
										gap={1.5}
										justifyContent="space-between"
										alignItems={{ md: "center" }}
									>
										<Box>
											<Typography variant="subtitle1">
												<strong>{game.white.name}</strong> (
												{game.white.rating ?? "?"}) vs{" "}
												<strong>{game.black.name}</strong> (
												{game.black.rating ?? "?"})
											</Typography>
											<Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
												{game.result && (
													<Chip size="small" label={game.result} />
												)}
												{game.timeControl && (
													<Chip size="small" label={game.timeControl} />
												)}
												{typeof game.isRated === "boolean" && (
													<Chip
														size="small"
														label={game.isRated ? "Rated" : "Casual"}
													/>
												)}
												{game.perfType && (
													<Chip
														size="small"
														label={game.perfType}
														variant="outlined"
													/>
												)}
												{game.openingName && (
													<Chip size="small" label={game.openingName} />
												)}
												{game.ecoCode && (
													<Chip size="small" label={game.ecoCode} />
												)}
												{game.termination && (
													<Chip size="small" label={game.termination} />
												)}
												{game.date && <Chip size="small" label={game.date} />}
											</Stack>
										</Box>
										<Button
											variant="outlined"
											onClick={() => handleAnalyzerOpen(game)}
										>
											Open in Analyzer
										</Button>
									</Stack>
								</Paper>
							))}
							{totalPages > 1 && (
								<Stack
									direction={{ xs: "column", sm: "row" }}
									spacing={1}
									justifyContent="space-between"
									alignItems={{ sm: "center" }}
								>
									<Pagination
										count={totalPages}
										page={page}
										onChange={(_, v) => setPage(v)}
										color="primary"
									/>
									<Stack direction="row" spacing={1} alignItems="center">
										<Typography variant="body2">Per page</Typography>
										<Select
											size="small"
											value={perPage}
											onChange={(e) => setPerPage(Number(e.target.value))}
										>
											{MAX_PER_PAGE_OPTIONS.map((option) => (
												<MenuItem key={option} value={option}>
													{option}
												</MenuItem>
											))}
										</Select>
									</Stack>
								</Stack>
							)}
						</Stack>
					)}
				</Paper>
			</Stack>
		</Container>
	);
}

export default function ImportPage() {
	return (
		<Suspense
			fallback={
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						minHeight: "60vh",
					}}
				>
					<CircularProgress />
				</Box>
			}
		>
			<ImportPageContent />
		</Suspense>
	);
}
