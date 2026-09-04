import { useGame } from './local/store.js';
import HomeScreen from './setup/HomeScreen.js';
import WaitingRoom from './setup/WaitingRoom.js';
import HotSeatGame from './game/HotSeatGame.js';

/**
 * Routing shell. Three states:
 *   - no game        → HomeScreen (Pass & Play setup / Online create-join)
 *   - online lobby   → WaitingRoom (room code + player list, host starts)
 *   - game running   → HotSeatGame (shared board; same views drive both modes)
 *
 * Local hot-seat games jump straight from HomeScreen to HotSeatGame because the
 * engine starts them in_progress; only online games pause in the lobby.
 */
export default function App() {
  const status = useGame((s) => s.state?.status ?? null);

  if (status === null) return <HomeScreen />;
  if (status === 'lobby') return <WaitingRoom />;
  return <HotSeatGame />;
}
