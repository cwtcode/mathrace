import React from 'react';
import { PlayerProfile, CHARACTERS } from '../utils/storage';

interface ResultsScreenProps {
  gameState: 'won' | 'lost' | 'ended';
  sessionPoints: number;
  profile: PlayerProfile;
  newUnlocks: string[];
  onPlayAgain: () => void;
  aiFeedback?: string;
  aiFeedbackLoading?: boolean;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({
  gameState,
  sessionPoints,
  profile,
  newUnlocks,
  onPlayAgain,
  aiFeedback,
  aiFeedbackLoading,
}) => {
  const isWon = gameState === 'won';
  const isEnded = gameState === 'ended';

  return (
    <div style={{
      padding: '2rem',
      backgroundColor: isEnded ? '#f8fafc' : isWon ? '#f0fdf4' : '#fef2f2',
      borderRadius: '12px',
      textAlign: 'center',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      border: `2px solid ${isEnded ? '#e2e8f0' : isWon ? '#bbf7d0' : '#fecaca'}`,
    }}>
      <h2 style={{ fontSize: '2rem', color: isEnded ? '#0f172a' : isWon ? '#166534' : '#991b1b', marginBottom: '1rem' }}>
        {isEnded ? '✅ 本局结束' : isWon ? '🎉 胜利！' : '👻 失败...'}
      </h2>
      
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '1.2rem', color: '#475569' }}>本次得分</p>
        <p style={{ fontSize: '3rem', fontWeight: 'bold', color: isEnded ? '#0f172a' : isWon ? '#15803d' : '#b91c1c', margin: '0.5rem 0' }}>
          {sessionPoints}
        </p>
      </div>

      {(aiFeedbackLoading || aiFeedback) && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          textAlign: 'left'
        }}>
          <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem' }}>AI Feedback</div>
          <div style={{ color: '#0f172a', fontWeight: 700, lineHeight: 1.5 }}>
            {aiFeedbackLoading ? 'Generating feedback…' : aiFeedback}
          </div>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '1rem', 
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: '8px'
      }}>
        <div>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>总积分</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>{profile.totalPoints}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>已解锁角色</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>{profile.unlockedCharacters.length} / {CHARACTERS.length}</p>
        </div>
      </div>

      {newUnlocks.length > 0 && (
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1rem', 
          backgroundColor: '#fef9c3', 
          borderRadius: '8px',
          border: '1px solid #fde047'
        }}>
          <h3 style={{ color: '#854d0e', marginBottom: '0.5rem' }}>✨ 新解锁！</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            {newUnlocks.map(name => (
              <span key={name} style={{ 
                padding: '0.25rem 0.75rem', 
                backgroundColor: 'white', 
                borderRadius: '999px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: '#854d0e'
              }}>{name}</span>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={onPlayAgain}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          backgroundColor: isEnded ? '#3b82f6' : isWon ? '#22c55e' : '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'transform 0.1s',
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isEnded ? '返回主页' : '再来一局'}
      </button>
    </div>
  );
};

export default ResultsScreen;
