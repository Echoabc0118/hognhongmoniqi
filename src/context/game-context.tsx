'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import {
  GameState,
  GameSettings,
  GameStatus,
  Message,
  SCENARIOS,
  LeaderboardEntry,
} from '@/lib/game-config';

// 初始状态
const initialState: GameState = {
  status: 'idle',
  settings: null,
  pleasure: 20, // 初始愉悦值
  round: 0,
  maxRounds: 15, // 默认15次对话
  messages: [],
  startTime: null,
  endTime: null,
};

// Action 类型
type GameAction =
  | { type: 'START_GAME'; settings: GameSettings }
  | { type: 'SELECT_SCENARIO'; scenarioId: number }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'UPDATE_PLEASURE'; pleasure: number; change: number }
  | { type: 'INCREMENT_ROUND' }
  | { type: 'END_GAME'; status: 'won' | 'lost' | 'timeout' }
  | { type: 'RESET_GAME' }
  | { type: 'SET_MAX_ROUNDS'; maxRounds: number };

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      // 如果 scenarioId 为 0，进入场景选择状态
      if (action.settings.scenarioId === 0) {
        return {
          ...initialState,
          status: 'selecting',
          settings: action.settings,
        };
      }
      // 否则直接开始游戏
      const scenario = SCENARIOS.find(s => s.id === action.settings.scenarioId);
      const maxRounds = Math.floor(Math.random() * 11) + 10; // 10-20次对话
      return {
        ...initialState,
        status: 'playing',
        settings: action.settings,
        pleasure: scenario?.initialPleasure || 20,
        maxRounds,
        startTime: Date.now(),
      };
    
    case 'SELECT_SCENARIO':
      // 选择场景后开始游戏
      const selectedScenario = SCENARIOS.find(s => s.id === action.scenarioId);
      const newMaxRounds = Math.floor(Math.random() * 11) + 10; // 10-20次对话
      return {
        ...state,
        status: 'playing',
        settings: state.settings ? { ...state.settings, scenarioId: action.scenarioId } : null,
        pleasure: selectedScenario?.initialPleasure || 20,
        maxRounds: newMaxRounds,
        startTime: Date.now(),
      };
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.message],
      };
    
    case 'UPDATE_PLEASURE':
      const newPleasure = Math.max(0, Math.min(100, action.pleasure));
      let newStatus: GameStatus = state.status;
      
      // 愉悦值达到100则胜利
      if (newPleasure >= 100) {
        newStatus = 'won';
      }
      
      return {
        ...state,
        pleasure: newPleasure,
        status: newStatus,
        endTime: newStatus !== 'playing' ? Date.now() : null,
      };
    
    case 'INCREMENT_ROUND':
      let status = state.status;
      const newRound = state.round + 1;
      
      // 对话次数用完且愉悦值未达到100，则失败
      if (newRound >= state.maxRounds && status === 'playing' && state.pleasure < 100) {
        status = 'timeout';
      }
      
      return {
        ...state,
        round: newRound,
        status,
        endTime: status !== 'playing' ? Date.now() : null,
      };
    
    case 'END_GAME':
      return {
        ...state,
        status: action.status,
        endTime: Date.now(),
      };
    
    case 'RESET_GAME':
      return initialState;
    
    case 'SET_MAX_ROUNDS':
      return {
        ...state,
        maxRounds: action.maxRounds,
      };
    
    default:
      return state;
  }
}

// Context 类型
interface GameContextType {
  state: GameState;
  startGame: (settings: GameSettings) => void;
  selectScenario: (scenarioId: number) => void;
  addMessage: (message: Message) => void;
  updatePleasure: (pleasure: number, change: number) => void;
  incrementRound: () => void;
  endGame: (status: 'won' | 'lost' | 'timeout') => void;
  resetGame: () => void;
  // 排行榜
  leaderboard: LeaderboardEntry[];
  addToLeaderboard: (entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>) => void;
}

// 创建 Context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Provider 组件
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
  // 排行榜状态（存储在 localStorage）
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('honohon_leaderboard');
    return saved ? JSON.parse(saved) : [];
  });
  
  // 保存排行榜到 localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('honohon_leaderboard', JSON.stringify(leaderboard));
    }
  }, [leaderboard]);
  
  const startGame = useCallback((settings: GameSettings) => {
    dispatch({ type: 'START_GAME', settings });
  }, []);
  
  const selectScenario = useCallback((scenarioId: number) => {
    dispatch({ type: 'SELECT_SCENARIO', scenarioId });
  }, []);
  
  const addMessage = useCallback((message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', message });
  }, []);
  
  const updatePleasure = useCallback((pleasure: number, change: number) => {
    dispatch({ type: 'UPDATE_PLEASURE', pleasure, change });
  }, []);
  
  const incrementRound = useCallback(() => {
    dispatch({ type: 'INCREMENT_ROUND' });
  }, []);
  
  const endGame = useCallback((status: 'won' | 'lost' | 'timeout') => {
    dispatch({ type: 'END_GAME', status });
  }, []);
  
  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);
  
  const addToLeaderboard = useCallback((entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>) => {
    const newEntry: LeaderboardEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setLeaderboard(prev => {
      const updated = [newEntry, ...prev].slice(0, 100); // 最多保留100条
      return updated.sort((a, b) => a.rounds - b.rounds);
    });
  }, []);
  
  return (
    <GameContext.Provider
      value={{
        state,
        startGame,
        selectScenario,
        addMessage,
        updatePleasure,
        incrementRound,
        endGame,
        resetGame,
        leaderboard,
        addToLeaderboard,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

// Hook
export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
