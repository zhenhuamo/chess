# Lichess API 本地参考

> 根据 lichess-org/api 仓库 `doc/specs/lichess-api.yaml`（版本 2.0.99）生成，便于离线查阅。

## 核心信息
- API 基础域名：`https://lichess.org`
- 预生产/本地：`https://lichess.dev`、`http://localhost:8080`
- 文档来源：`https://github.com/lichess-org/api`
- 项目协议：AGPL-3.0-or-later (https://www.gnu.org/licenses/agpl-3.0.txt)

## 速率限制与流式响应
- 官方建议一次仅发起一个请求，若收到 `429 Too Many Requests`，需要暂停至少 60 秒再继续。
- 多个端点（对局流、事件流、广播）返回 [NDJSON](https://github.com/ndjson/ndjson-spec)，需要逐行解析。
- 游戏、研究等导出端点常以 `application/x-chess-pgn` 形式返回 PGN。

## 认证方式
1. **Personal Access Token**：在 `https://lichess.org/account/oauth/token` 创建，调用时在 HTTP Header 添加 `Authorization: Bearer <token>`。
2. **OAuth 2.0 Authorization Code + PKCE**：适合第三方登录，仅接受 `S256` challenge，Access Token 长期有效（无 Refresh Token）。
3. **Token 安全**：不可硬编码或公开，泄漏后需立即撤销。

### OAuth 作用域
| Scope | 说明 |
| --- | --- |
| `board:play` | Play with the Board API |
| `bot:play` | Play with the Bot API. Only for [Bot accounts](#operation/botAccountUpgrade) |
| `challenge:bulk` | Create, delete, query bulk pairings |
| `challenge:read` | Read incoming challenges |
| `challenge:write` | Create, accept, decline challenges |
| `email:read` | Read your email address |
| `engine:read` | Read your external engines |
| `engine:write` | Create, update, delete your external engines |
| `follow:read` | Read followed players |
| `follow:write` | Follow and unfollow other players |
| `msg:write` | Send private messages to other players |
| `preference:read` | Read your preferences |
| `preference:write` | Write your preferences |
| `puzzle:read` | Read puzzle activity |
| `puzzle:write` | Write puzzle activity |
| `racer:write` | Create and join puzzle races |
| `study:read` | Read private studies and broadcasts |
| `study:write` | Create, update, delete studies and broadcasts |
| `team:lead` | Manage teams (kick members, send PMs) |
| `team:read` | Read private team information |
| `team:write` | Join, leave teams |
| `tournament:write` | Create tournaments |
| `web:mod` | Use moderator tools (within the bounds of your permissions) |

## Endpoint 分类索引

### Account
Read and write account information and preferences.
<https://lichess.org/account/preferences/game-display>
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/account` | Get my profile | 需 OAuth 令牌 |
| `GET` | `/api/account/email` | Get my email address | 需 OAuth 令牌 |
| `GET` | `/api/account/preferences` | Get my preferences | 需 OAuth 令牌 |
| `GET` | `/api/account/kid` | Get my kid mode status | 需 OAuth 令牌 |
| `POST` | `/api/account/kid` | Set my kid mode status | 需 OAuth 令牌 |
| `GET` | `/api/timeline` | Get my timeline | 需 OAuth 令牌 |

### Users
Access registered users on Lichess.
<https://lichess.org/player>

- Each user blog exposes an atom (RSS) feed, like <https://lichess.org/@/thibault/blog.atom>
- User blogs mashup feed: https://lichess.org/blog/community.atom
- User blogs mashup feed for a language: https://lichess.org/blog/community/fr.atom
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/users/status` | Get real-time users status | 无需认证 |
| `GET` | `/api/player` | Get all top 10 | 无需认证 |
| `GET` | `/api/player/top/{nb}/{perfType}` | Get one leaderboard | 无需认证 |
| `GET` | `/api/user/{username}` | Get user public data | 需 OAuth 令牌 |
| `GET` | `/api/user/{username}/rating-history` | Get rating history of a user | 无需认证 |
| `GET` | `/api/user/{username}/perf/{perf}` | Get performance statistics of a user | 无需认证 |
| `GET` | `/api/user/{username}/activity` | Get user activity | 无需认证 |
| `POST` | `/api/users` | Get users by ID | 需要请求体；无需认证 |
| `GET` | `/api/streamer/live` | Get live streamers | 无需认证 |
| `GET` | `/api/crosstable/{user1}/{user2}` | Get crosstable | 无需认证 |
| `GET` | `/api/player/autocomplete` | Autocomplete usernames | 无需认证 |
| `POST` | `/api/user/{username}/note` | Add a note for a user | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/user/{username}/note` | Get notes for a user | 需 OAuth 令牌 |

### Relations
Access relations between users.
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/rel/following` | Get users followed by the logged in user | NDJSON 流；需 OAuth 令牌 |
| `POST` | `/api/rel/follow/{username}` | Follow a player | 需 OAuth 令牌 |
| `POST` | `/api/rel/unfollow/{username}` | Unfollow a player | 需 OAuth 令牌 |
| `POST` | `/api/rel/block/{username}` | Block a player | 需 OAuth 令牌 |
| `POST` | `/api/rel/unblock/{username}` | Unblock a player | 需 OAuth 令牌 |

### Games
Access games played on Lichess.
<https://lichess.org/games>
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/game/export/{gameId}` | Export one game | PGN 输出；无需认证 |
| `GET` | `/api/user/{username}/current-game` | Export ongoing game of a user | PGN 输出；无需认证 |
| `GET` | `/api/games/user/{username}` | Export games of a user | NDJSON 流；PGN 输出；需 OAuth 令牌 |
| `POST` | `/api/games/export/_ids` | Export games by IDs | 需要请求体；NDJSON 流；PGN 输出；无需认证 |
| `POST` | `/api/stream/games-by-users` | Stream games of users | 需要请求体；NDJSON 流；无需认证 |
| `POST` | `/api/stream/games/{streamId}` | Stream games by IDs | 需要请求体；NDJSON 流；无需认证 |
| `POST` | `/api/stream/games/{streamId}/add` | Add game IDs to stream | 需要请求体；无需认证 |
| `GET` | `/api/account/playing` | Get my ongoing games | 需 OAuth 令牌 |
| `GET` | `/api/stream/game/{id}` | Stream moves of a game | NDJSON 流；无需认证 |
| `POST` | `/api/import` | Import one game | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/games/export/imports` | Export your imported games | PGN 输出；需 OAuth 令牌 |
| `GET` | `/api/games/export/bookmarks` | Export your bookmarked games | NDJSON 流；PGN 输出；需 OAuth 令牌 |

### TV
Access Lichess TV channels and games.
<https://lichess.org/tv> & <https://lichess.org/games>
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/tv/channels` | Get current TV games | 无需认证 |
| `GET` | `/api/tv/feed` | Stream current TV game | NDJSON 流；无需认证 |
| `GET` | `/api/tv/{channel}/feed` | Stream current TV game of a TV channel | NDJSON 流；无需认证 |
| `GET` | `/api/tv/{channel}` | Get best ongoing games of a TV channel | NDJSON 流；PGN 输出；无需认证 |

### Puzzles
Access Lichess [puzzle history and dashboard](https://lichess.org/training).

Our collection of puzzles is in the public domain, you can [download it here](https://database.lichess.org/#puzzles).
For a list of our puzzle themes with their description, check out the [theme translation file](https://github.com/ornicar/lila/blob/master/translation/source/puzzleTheme.xml).
The daily puzzle can be [posted in your slack workspace](https://lichess.org/daily-puzzle-slack).
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/puzzle/daily` | Get the daily puzzle | 无需认证 |
| `GET` | `/api/puzzle/{id}` | Get a puzzle by its ID | 无需认证 |
| `GET` | `/api/puzzle/next` | Get a new puzzle | 需 OAuth 令牌 |
| `GET` | `/api/puzzle/batch/{angle}` | Get multiple puzzles at once | 需 OAuth 令牌 |
| `POST` | `/api/puzzle/batch/{angle}` | Solve multiple puzzles at once | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/puzzle/activity` | Get your puzzle activity | NDJSON 流；需 OAuth 令牌 |
| `GET` | `/api/puzzle/replay/{days}/{theme}` | Get puzzles to replay | 需 OAuth 令牌 |
| `GET` | `/api/puzzle/dashboard/{days}` | Get your puzzle dashboard | 需 OAuth 令牌 |
| `GET` | `/api/storm/dashboard/{username}` | Get the storm dashboard of a player | 无需认证 |
| `POST` | `/api/racer` | Create and join a puzzle race | 需 OAuth 令牌 |
| `GET` | `/api/racer/{id}` | Get puzzle race results | 需 OAuth 令牌 |

### Teams
Access and manage Lichess teams and their members.
<https://lichess.org/team>
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/team/{teamId}/swiss` | Get team swiss tournaments | NDJSON 流；无需认证 |
| `GET` | `/api/team/{teamId}` | Get a single team | 无需认证 |
| `GET` | `/api/team/all` | Get popular teams | 无需认证 |
| `GET` | `/api/team/of/{username}` | Teams of a player | 无需认证 |
| `GET` | `/api/team/search` | Search teams | 无需认证 |
| `GET` | `/api/team/{teamId}/users` | Get members of a team | NDJSON 流；需 OAuth 令牌 |
| `GET` | `/api/team/{teamId}/arena` | Get team Arena tournaments | NDJSON 流；无需认证 |
| `POST` | `/team/{teamId}/join` | Join a team | 需要请求体；需 OAuth 令牌 |
| `POST` | `/team/{teamId}/quit` | Leave a team | 需 OAuth 令牌 |
| `GET` | `/api/team/{teamId}/requests` | Get join requests | 需 OAuth 令牌 |
| `POST` | `/api/team/{teamId}/request/{userId}/accept` | Accept join request | 需 OAuth 令牌 |
| `POST` | `/api/team/{teamId}/request/{userId}/decline` | Decline join request | 需 OAuth 令牌 |
| `POST` | `/api/team/{teamId}/kick/{userId}` | Kick a user from your team | 需 OAuth 令牌 |
| `POST` | `/team/{teamId}/pm-all` | Message all members | 需要请求体；需 OAuth 令牌 |

### Board
Play on Lichess with physical boards and third-party clients.
Works with normal Lichess accounts. Engine play or assistance is [forbidden](https://lichess.org/page/fair-play).

### Features
- [Stream incoming chess moves](#operation/boardGameStream)
- [Play chess moves](#operation/boardGameMove)
- [Read](#operation/boardGameStream) and [write](#operation/boardGameChatPost) in the player and spectator chats
- [Receive](#operation/apiStreamEvent), [create](#operation/challengeCreate) and [accept](#operation/challengeAccept) (or [decline](#operation/challengeDecline)) challenges
- [Abort](#operation/boardGameAbort) and [resign](#operation/boardGameResign) games
- Compatible with normal Lichess accounts

### Restrictions
- Engine assistance, or any kind of outside help, is [forbidden](https://lichess.org/page/fair-play)
- Time controls: [Rapid, Classical and Correspondence](https://lichess.org/faq#time-controls) only.
  For direct challenges, games vs AI, and bulk pairing, Blitz is also possible.

### Links
- [Announcement](https://lichess.org/blog/XlRW5REAAB8AUJJ-/welcome-lichess-boards)
- [Implementation example](https://github.com/lichess-org/api-demo) and [live demo](https://lichess-org.github.io/api-demo/)
- [Certabo support](https://github.com/haklein/certabo-lichess)
- [Lichs (play from command-line)](https://github.com/Cqsi/lichs)
- [Lichess discord bot](https://top.gg/bot/707287095911120968)
- [cli-chess](https://github.com/trevorbayless/cli-chess/)
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/stream/event` | Stream incoming events | NDJSON 流；需 OAuth 令牌 |
| `POST` | `/api/board/seek` | Create a seek | 需要请求体；NDJSON 流；需 OAuth 令牌 |
| `GET` | `/api/board/game/stream/{gameId}` | Stream Board game state | NDJSON 流；需 OAuth 令牌 |
| `POST` | `/api/board/game/{gameId}/move/{move}` | Make a Board move | 需 OAuth 令牌 |
| `POST` | `/api/board/game/{gameId}/chat` | Write in the chat | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/board/game/{gameId}/chat` | Fetch the game chat | NDJSON 流；需 OAuth 令牌 |
| `POST` | `/api/board/game/{gameId}/abort` | Abort a game | 需 OAuth 令牌 |
| `POST` | `/api/board/game/{gameId}/resign` | Resign a game | 需 OAuth 令牌 |
| `POST` | `/api/board/game/{gameId}/draw/{accept}` | Handle draw offers | 需 OAuth 令牌 |
| `POST` | `/api/board/game/{gameId}/takeback/{accept}` | Handle takeback offers | 需 OAuth 令牌 |
| `POST` | `/api/board/game/{gameId}/claim-victory` | Claim victory of a game | 需 OAuth 令牌 |
| `POST` | `/api/board/game/{gameId}/claim-draw` | Claim draw of a game | 需 OAuth 令牌 |
| `POST` | `/api/board/game/{gameId}/berserk` | Berserk a tournament game | 需 OAuth 令牌 |

### Bot
Play on Lichess as a bot. Allows engine play.
Read the [blog post announcement of lichess bots](https://lichess.org/blog/WvDNticAAMu_mHKP/welcome-lichess-bots).

Only works with [Bot accounts](#operation/botAccountUpgrade).

### Features
- [Stream incoming chess moves](#operation/botGameStream)
- [Play chess moves](#operation/botGameMove)
- [Read](#operation/botGameStream) and [write](#operation/botGameChat) in the player and spectator chats
- [Receive](#operation/apiStreamEvent), [create](#operation/challengeCreate) and [accept](#operation/challengeAccept) (or [decline](#operation/challengeDecline)) challenges
- [Abort](#operation/botGameAbort) and [resign](#operation/botGameResign) games
- Engine assistance is [allowed](https://lichess.org/page/fair-play)
### Restrictions
- Bots can only play challenge games:  pools and tournaments are off-limits
- Bots cannot play UltraBullet (¼+0) because it requires making too many requests. But 0+1 and ½+0 are allowed.
- Bots must follow [Lichess TOS](https://lichess.org/terms-of-service) specifically Sandbagging, Constant Aborting, Boosting, etc
- Bot devs are advised to make their Bots play casual only when testing their Bots logic and to avoid breaking Lichess TOS.
### Integrations
- [Python3 lichess-bot](https://github.com/lichess-bot-devs/lichess-bot) (official)
- [Python3 lichess UCI bot](https://github.com/Torom/BotLi)
- [JavaScript bot-o-tron](https://github.com/tailuge/bot-o-tron)
- [Golang lichess-bot](https://github.com/dolegi/lichess-bot)
- [Electronic Chessboard](http://www.oliviermercier.com/res/projects/chessboard/)
- Yours? Please make [an issue or pull request](https://github.com/lichess-org/api).
### Links
- [Announcement](https://lichess.org/blog/WvDNticAAMu_mHKP/welcome-lichess-bots)
- Join the [Lichess Bots team](https://lichess.org/team/lichess-bots) with your bot account
- [Get help in the discord channel](https://discord.gg/quwueFd)
- Watch [Lichess Bot TV](https://lichess.org/tv/bot)
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/stream/event` | Stream incoming events | NDJSON 流；需 OAuth 令牌 |
| `GET` | `/api/bot/online` | Get online bots | NDJSON 流；无需认证 |
| `POST` | `/api/bot/account/upgrade` | Upgrade to Bot account | 需 OAuth 令牌 |
| `GET` | `/api/bot/game/stream/{gameId}` | Stream Bot game state | NDJSON 流；需 OAuth 令牌 |
| `POST` | `/api/bot/game/{gameId}/move/{move}` | Make a Bot move | 需 OAuth 令牌 |
| `POST` | `/api/bot/game/{gameId}/chat` | Write in the chat | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/bot/game/{gameId}/chat` | Fetch the game chat | NDJSON 流；需 OAuth 令牌 |
| `POST` | `/api/bot/game/{gameId}/abort` | Abort a game | 需 OAuth 令牌 |
| `POST` | `/api/bot/game/{gameId}/resign` | Resign a game | 需 OAuth 令牌 |
| `POST` | `/api/bot/game/{gameId}/draw/{accept}` | Handle draw offers | 需 OAuth 令牌 |
| `POST` | `/api/bot/game/{gameId}/takeback/{accept}` | Handle takeback offers | 需 OAuth 令牌 |
| `POST` | `/api/bot/game/{gameId}/claim-victory` | Claim victory of a game | 需 OAuth 令牌 |
| `POST` | `/api/bot/game/{gameId}/claim-draw` | Claim draw of a game | 需 OAuth 令牌 |

### Challenges
Send and receive challenges to play.

To create a lot of challenges, consider [bulk pairing](#operation/bulkPairingCreate) instead.
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/challenge` | List your challenges | 需 OAuth 令牌 |
| `POST` | `/api/challenge/{username}` | Create a challenge | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/challenge/{challengeId}/show` | Show one challenge | 需 OAuth 令牌 |
| `POST` | `/api/challenge/{challengeId}/accept` | Accept a challenge | 需 OAuth 令牌 |
| `POST` | `/api/challenge/{challengeId}/decline` | Decline a challenge | 需要请求体；需 OAuth 令牌 |
| `POST` | `/api/challenge/{challengeId}/cancel` | Cancel a challenge | 需 OAuth 令牌 |
| `POST` | `/api/challenge/ai` | Challenge the AI | 需要请求体；需 OAuth 令牌 |
| `POST` | `/api/challenge/open` | Open-ended challenge | 需要请求体；无需认证 |
| `POST` | `/api/challenge/{gameId}/start-clocks` | Start clocks of a game | 需 OAuth 令牌 |
| `POST` | `/api/round/{gameId}/add-time/{seconds}` | Add time to the opponent clock | 需 OAuth 令牌 |
| `POST` | `/api/token/admin-challenge` | Admin challenge tokens | 需要请求体；需 OAuth 令牌 |

### Bulk pairings
Create many games for other players.

These endpoints are intended for tournament organisers.
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/bulk-pairing` | View your bulk pairings | 需 OAuth 令牌 |
| `POST` | `/api/bulk-pairing` | Create a bulk pairing | 需要请求体；需 OAuth 令牌 |
| `POST` | `/api/bulk-pairing/{id}/start-clocks` | Manually start clocks | 需 OAuth 令牌 |
| `GET` | `/api/bulk-pairing/{id}` | Show a bulk pairing | 需 OAuth 令牌 |
| `DELETE` | `/api/bulk-pairing/{id}` | Cancel a bulk pairing | 需 OAuth 令牌 |
| `GET` | `/api/bulk-pairing/{id}/games` | Export games of a bulk pairing | NDJSON 流；PGN 输出；需 OAuth 令牌 |

### Arena tournaments
Access Arena tournaments played on Lichess.
[Official Arena tournaments](https://lichess.org/tournament) are maintained by Lichess,
but you can [create your own Arena tournaments](https://lichess.org/tournament/new) as well.
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/tournament` | Get current tournaments | 无需认证 |
| `POST` | `/api/tournament` | Create a new Arena tournament | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/tournament/{id}` | Get info about an Arena tournament | 无需认证 |
| `POST` | `/api/tournament/{id}` | Update an Arena tournament | 需要请求体；需 OAuth 令牌 |
| `POST` | `/api/tournament/{id}/join` | Join an Arena tournament | 需要请求体；需 OAuth 令牌 |
| `POST` | `/api/tournament/{id}/withdraw` | Pause or leave an Arena tournament | 需 OAuth 令牌 |
| `POST` | `/api/tournament/{id}/terminate` | Terminate an Arena tournament | 需 OAuth 令牌 |
| `POST` | `/api/tournament/team-battle/{id}` | Update a team battle | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/tournament/{id}/games` | Export games of an Arena tournament | NDJSON 流；PGN 输出；无需认证 |
| `GET` | `/api/tournament/{id}/results` | Get results of an Arena tournament | NDJSON 流；无需认证 |
| `GET` | `/api/tournament/{id}/teams` | Get team standing of a team battle | 无需认证 |
| `GET` | `/api/user/{username}/tournament/created` | Get tournaments created by a user | NDJSON 流；需 OAuth 令牌 |
| `GET` | `/api/user/{username}/tournament/played` | Get tournaments played by a user | NDJSON 流；需 OAuth 令牌 |
| `GET` | `/api/team/{teamId}/arena` | Get team Arena tournaments | NDJSON 流；无需认证 |

### Swiss tournaments
Access Swiss tournaments played on Lichess.
[Read more about Swiss tournaments.](https://lichess.org/swiss).
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `POST` | `/api/swiss/new/{teamId}` | Create a new Swiss tournament | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/swiss/{id}` | Get info about a Swiss tournament | 无需认证 |
| `POST` | `/api/swiss/{id}/edit` | Update a Swiss tournament | 需要请求体；需 OAuth 令牌 |
| `POST` | `/api/swiss/{id}/schedule-next-round` | Manually schedule the next round | 需要请求体；需 OAuth 令牌 |
| `POST` | `/api/swiss/{id}/join` | Join a Swiss tournament | 需要请求体；需 OAuth 令牌 |
| `POST` | `/api/swiss/{id}/withdraw` | Pause or leave a swiss tournament | 需 OAuth 令牌 |
| `POST` | `/api/swiss/{id}/terminate` | Terminate a Swiss tournament | 需 OAuth 令牌 |
| `GET` | `/swiss/{id}.trf` | Export TRF of a Swiss tournament | 无需认证 |
| `GET` | `/api/swiss/{id}/games` | Export games of a Swiss tournament | NDJSON 流；PGN 输出；无需认证 |
| `GET` | `/api/swiss/{id}/results` | Get results of a swiss tournament | NDJSON 流；无需认证 |
| `GET` | `/api/team/{teamId}/swiss` | Get team swiss tournaments | NDJSON 流；无需认证 |

### Simuls
Access simuls played on Lichess.
<https://lichess.org/simul>
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/simul` | Get current simuls | 无需认证 |

### Studies
Access Lichess studies.
<https://lichess.org/study>
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/study/{studyId}/{chapterId}.pgn` | Export one study chapter | PGN 输出；需 OAuth 令牌 |
| `GET` | `/api/study/{studyId}.pgn` | Export all chapters | PGN 输出；需 OAuth 令牌 |
| `POST` | `/api/study/{studyId}/import-pgn` | Import PGN into a study | 需要请求体；需 OAuth 令牌 |
| `POST` | `/api/study/{studyId}/{chapterId}/tags` | Update PGN tags of a study chapter | 需要请求体；需 OAuth 令牌 |
| `GET` | `/study/by/{username}/export.pgn` | Export all studies of a user | PGN 输出；需 OAuth 令牌 |
| `GET` | `/api/study/by/{username}` | List studies of a user | NDJSON 流；需 OAuth 令牌 |
| `DELETE` | `/api/study/{studyId}/{chapterId}` | Delete a study chapter | 需 OAuth 令牌 |

### Messaging
Private messages with other players.
<https://lichess.org/inbox>
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `POST` | `/inbox/{username}` | Send a private message | 需要请求体；需 OAuth 令牌 |

### Broadcasts
Relay chess events on Lichess.
[Official broadcasts](https://lichess.org/broadcast) are maintained by Lichess,
but you can [create your own broadcasts](https://lichess.org/broadcast/new) to cover any live game or chess event.
You will need to publish PGN on a public URL so that Lichess can pull updates from it.
Alternatively, you can push PGN updates to Lichess using [this API endpoint](#tag/Broadcasts/operation/broadcastPush).

Broadcasts are organized in tournaments, which have several rounds, which have several games.
You must first create a tournament, then you can add rounds to them.
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/broadcast` | Get official broadcasts | NDJSON 流；无需认证 |
| `GET` | `/api/broadcast/top` | Get paginated top broadcast previews | 无需认证 |
| `GET` | `/api/broadcast/by/{username}` | Get broadcasts created by a user | 需 OAuth 令牌 |
| `GET` | `/api/broadcast/search` | Search broadcasts | 无需认证 |
| `POST` | `/broadcast/new` | Create a broadcast tournament | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/broadcast/{broadcastTournamentId}` | Get a broadcast tournament | 需 OAuth 令牌 |
| `GET` | `/broadcast/{broadcastTournamentId}/players` | Get players of a broadcast | 无需认证 |
| `GET` | `/broadcast/{broadcastTournamentId}/players/{playerId}` | Get a player from a broadcast | 无需认证 |
| `POST` | `/broadcast/{broadcastTournamentId}/edit` | Update your broadcast tournament | 需要请求体；需 OAuth 令牌 |
| `POST` | `/broadcast/{broadcastTournamentId}/new` | Create a broadcast round | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/broadcast/{broadcastTournamentSlug}/{broadcastRoundSlug}/{broadcastRoundId}` | Get a broadcast round | 无需认证 |
| `POST` | `/broadcast/round/{broadcastRoundId}/edit` | Update a broadcast round | 需要请求体；需 OAuth 令牌 |
| `POST` | `/api/broadcast/round/{broadcastRoundId}/reset` | Reset a broadcast round | 需 OAuth 令牌 |
| `POST` | `/api/broadcast/round/{broadcastRoundId}/push` | Push PGN to a broadcast round | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/stream/broadcast/round/{broadcastRoundId}.pgn` | Stream an ongoing broadcast round as PGN | PGN 输出；无需认证 |
| `GET` | `/api/broadcast/round/{broadcastRoundId}.pgn` | Export one round as PGN | PGN 输出；无需认证 |
| `GET` | `/api/broadcast/{broadcastTournamentId}.pgn` | Export all rounds as PGN | PGN 输出；需 OAuth 令牌 |
| `GET` | `/api/broadcast/my-rounds` | Get your broadcast rounds | NDJSON 流；需 OAuth 令牌 |

### FIDE
FIDE players and federations from [their public download](https://ratings.fide.com/download_lists.phtml).

<https://lichess.org/fide>
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/fide/player/{playerId}` | Get a FIDE player | 无需认证 |
| `GET` | `/api/fide/player` | Search FIDE players | 无需认证 |

### Analysis
Access Lichess cloud evaluations database.
<https://lichess.org/analysis>
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/cloud-eval` | Get cloud evaluation of a position. | 无需认证 |

### External engine
**This API is in alpha and subject to change.**

Use or provide external engine analysis.

External engines can provide analysis on pages like the
[analysis board](https://lichess.org/analysis), running as a service
outside of the browser, or even on a different machine.
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/api/external-engine` | List external engines | 需 OAuth 令牌 |
| `POST` | `/api/external-engine` | Create external engine | 需要请求体；需 OAuth 令牌 |
| `GET` | `/api/external-engine/{id}` | Get external engine | 需 OAuth 令牌 |
| `PUT` | `/api/external-engine/{id}` | Update external engine | 需要请求体；需 OAuth 令牌 |
| `DELETE` | `/api/external-engine/{id}` | Delete external engine | 需 OAuth 令牌 |
| `POST` | `/api/external-engine/{id}/analyse` | Analyse with external engine | 需要请求体；NDJSON 流；无需认证 |
| `POST` | `/api/external-engine/work` | Acquire analysis request | 需要请求体；无需认证 |
| `POST` | `/api/external-engine/work/{id}` | Answer analysis request | 需要请求体；无需认证 |

### Opening Explorer
Lookup positions from the [Lichess opening explorer](https://lichess.org/analysis#explorer).

Runs <https://github.com/lichess-org/lila-openingexplorer>.

**The endpoint hostname is not lichess.org but explorer.lichess.ovh.**
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/masters` | Masters database | 无需认证 |
| `GET` | `/lichess` | Lichess games | 无需认证 |
| `GET` | `/player` | Player games | NDJSON 流；无需认证 |
| `GET` | `/master/pgn/{gameId}` | OTB master game | PGN 输出；无需认证 |

### Tablebase
Lookup positions from the [Lichess tablebase server](https://lichess.org/blog/W3WeMyQAACQAdfAL/7-piece-syzygy-tablebases-are-complete).

**The endpoint hostname is not lichess.org but tablebase.lichess.ovh.**
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/standard` | Tablebase lookup | 无需认证 |
| `GET` | `/atomic` | Tablebase lookup for Atomic chess | 无需认证 |
| `GET` | `/antichess` | Tablebase lookup for Antichess | 无需认证 |

### OAuth
Obtaining and revoking OAuth tokens.

[Read about the Lichess API authentication methods and code examples](https://github.com/lichess-org/api/blob/master/example/README.md).
| 方法 | 路径 | 摘要 | 备注 |
| --- | --- | --- | --- |
| `GET` | `/oauth` | Request authorization code | 无需认证 |
| `POST` | `/api/token` | Obtain access token | 需要请求体；无需认证 |
| `DELETE` | `/api/token` | Revoke access token | 需 OAuth 令牌 |
| `POST` | `/api/token/test` | Test multiple OAuth tokens | 需要请求体；无需认证 |
