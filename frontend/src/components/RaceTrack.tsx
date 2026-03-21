import React from 'react';

interface RaceTrackProps {
  playerProgress: number; // 0 to 100
  ghostProgress: number;  // 0 to 100
  isSpeedingUp?: boolean;
  playerIcon?: string;
}

const RaceTrack: React.FC<RaceTrackProps> = ({ 
  playerProgress, 
  ghostProgress, 
  isSpeedingUp,
  playerIcon = '🚗'
}) => {
  return (
    <div className="race-track" style={{
      margin: 0,
      padding: '1.5rem',
      backgroundColor: '#1e293b',
      borderRadius: '16px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      color: '#ffffff'
    }}>
      <div className="track-row" style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <span>You</span>
          <span>{Math.round(playerProgress)}%</span>
        </div>
        <div style={{ height: '12px', backgroundColor: '#334155', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ 
            height: '100%', 
            width: `${playerProgress}%`, 
            backgroundColor: isSpeedingUp ? '#22c55e' : '#3b82f6', 
            transition: 'width 0.3s ease-out, background-color 0.3s ease',
            boxShadow: isSpeedingUp ? '0 0 15px #22c55e' : '0 0 10px #3b82f6'
          }}></div>
          {/* Racer icon placeholder */}
          <div style={{
            position: 'absolute',
            left: `clamp(0px, calc(${playerProgress}% - 10px), calc(100% - 20px))`,
            top: '-5px',
            fontSize: isSpeedingUp ? '1.8rem' : '1.2rem',
            transition: 'left 0.3s ease-out, font-size 0.3s ease',
            filter: isSpeedingUp ? 'drop-shadow(0 0 8px #22c55e)' : 'none'
          }}>{playerIcon}</div>
        </div>
      </div>

      <div className="track-row">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <span style={{ color: '#94a3b8' }}>Ghost</span>
          <span style={{ color: '#94a3b8' }}>{Math.round(ghostProgress)}%</span>
        </div>
        <div style={{ height: '12px', backgroundColor: '#334155', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ 
            height: '100%', 
            width: `${ghostProgress}%`, 
            backgroundColor: '#ef4444', 
            transition: 'width 0.3s ease-out',
            opacity: 0.6,
            boxShadow: '0 0 10px #ef4444'
          }}></div>
          {/* Ghost icon placeholder */}
          <div style={{
            position: 'absolute',
            left: `clamp(0px, calc(${ghostProgress}% - 10px), calc(100% - 20px))`,
            top: '-5px',
            fontSize: '1.2rem',
            transition: 'left 0.3s ease-out',
            opacity: 0.8
          }}>👻</div>
        </div>
      </div>
    </div>
  );
};

export default RaceTrack;
