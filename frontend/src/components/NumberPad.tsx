import React from 'react';

interface NumberPadProps {
  onKeyPress: (key: string) => void;
  onClear: () => void;
  onDelete: () => void;
}

const NumberPad: React.FC<NumberPadProps> = ({ onKeyPress, onClear, onDelete }) => {
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  const handleButtonClick = (key: string) => {
    if (key === 'C') {
      onClear();
    } else if (key === '⌫') {
      onDelete();
    } else {
      onKeyPress(key);
    }
  };

  return (
    <div className="number-pad" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px',
      maxWidth: '300px',
      margin: '0 auto',
      padding: '1rem',
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      {numbers.map((num) => (
        <button
          key={num}
          onClick={() => handleButtonClick(num)}
          style={{
            padding: '1.5rem',
            fontSize: '1.5rem',
            fontWeight: '600',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: num === 'C' ? '#ef4444' : num === '⌫' ? '#f59e0b' : '#ffffff',
            color: num === 'C' || num === '⌫' ? '#ffffff' : '#374151',
            cursor: 'pointer',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            userSelect: 'none'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
            e.currentTarget.style.boxShadow = 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {num}
        </button>
      ))}
    </div>
  );
};

export default NumberPad;
