export interface TacticalPlayer {
  id?: string;
  name: string;
  role?: string;
  assetKey?: `tm:${number}`;
  portraitScale?: number;
  /** Coordinates normalized from 0 to 100 across the pitch. */
  x: number;
  y: number;
}

export interface TacticalBoardData {
  title: string;
  formation?: string;
  playerAppearance?: 'marker' | 'portrait';
  description?: string;
  players: TacticalPlayer[];
  connections?: [string, string][];
  movements?: { from: [number, number]; to: [number, number] }[];
  zones?: { x: number; y: number; width: number; height: number; label?: string }[];
}

export type ArticleBlock =
  | ({ type: 'tactical-board' } & TacticalBoardData)
  | { type: 'tactical-comparison'; title: string; explanation?: string; left: TacticalBoardData; right: TacticalBoardData }
  | { type: 'stat-cards'; title?: string; stats: { value: string; label: string; description?: string; source?: string }[]; note?: string }
  | { type: 'editorial-callout'; title?: string; text: string }
  | { type: 'source-note'; source?: string; url?: string; date?: string; methodology?: string; description?: string }
  | { type: 'chart-block'; chartType: 'bar' | 'line' | 'comparison'; title: string; description?: string; labels: string[]; series: { name: string; values: number[] }[]; source?: string; note?: string }
  | { type: 'oneshot-svg'; markup: string };

export interface EnrichedTacticPlayer { id: string; name: string; x: number; y: number; role?: string; assetKey?: `tm:${number}`; portraitScale?: number }
export interface EnrichedTacticConnection { from: string; to: string; style?: 'solid' | 'dashed' }
export interface EnrichedTactic {
  schemaVersion: 1;
  title?: string;
  description?: string;
  caption?: string;
  playerAppearance?: 'marker' | 'portrait';
  players: EnrichedTacticPlayer[];
  connections?: EnrichedTacticConnection[];
}
