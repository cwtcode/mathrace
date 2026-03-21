import React from 'react';

interface QuestionDisplayProps {
  question: string;
  answer: string;
  feedback?: 'correct' | 'incorrect' | null;
  errorCount?: number;
  operands?: { a: number, b: number, operator?: string };
  explanation?: string;
  showAnswer?: boolean;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ 
  question, 
  answer, 
  feedback, 
  showAnswer = true
}) => {
  const getFeedbackStyles = () => {
    if (feedback === 'correct') {
      return { backgroundColor: '#dcfce7', transform: 'scale(1.05)' };
    }
    if (feedback === 'incorrect') {
      return { backgroundColor: '#fee2e2', animation: 'shake 0.5s' };
    }
    return { backgroundColor: '#f3f4f6' };
  };

  return (
    <div className="question-wrapper">
      <div className="question-container" style={{
        fontSize: '2.5rem',
        fontWeight: 'bold',
        textAlign: 'left',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '0.75rem',
        margin: 0,
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        ...getFeedbackStyles()
      }}>
        <span className="question-text" style={{ flex: '1 1 auto', minWidth: '180px' , color: '#0f172a'}}>{question} = </span>
        <span className="answer-text" style={{ 
          color: showAnswer
            ? (feedback === 'correct' ? '#166534' : feedback === 'incorrect' ? '#991b1b' : '#2563eb')
            : '#64748b',
          borderBottom: `4px solid ${
            showAnswer
              ? (feedback === 'correct' ? '#166534' : feedback === 'incorrect' ? '#991b1b' : '#2563eb')
              : '#94a3b8'
          }`,
          minWidth: '1.5em',
          display: 'inline-block',
          textAlign: 'right'
        }}>
          {showAnswer ? (answer || '?') : '____'}
        </span>
      </div>

      {/* Hints section */}
      {/* <div className="hints-container" style={{ textAlign: 'left', minHeight: '100px' }}>
        {errorCount >= 1 && (
          <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
            {explanation || "Oops, try again!"}
          </div>
        )}
        
        {errorCount >= 2 && operands && operands.operator !== 'none' && (
          <div className="visual-aid" style={{ 
            display: 'flex', 
            justifyContent: 'flex-start', 
            alignItems: 'center', 
            gap: '1rem',
            backgroundColor: 'white',
            padding: '0.8rem',
            borderRadius: '12px',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '120px', justifyContent: 'center' }}>
              {renderVisualAid(operands.a, '#ef4444')}
            </div>
            {operands.operator !== 'none' && (
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{operands.operator}</span>
            )}
            {operands.b > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '120px', justifyContent: 'center' }}>
                {renderVisualAid(operands.b, '#ef4444')}
              </div>
            )}
          </div>
        )}
      </div> */}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
};

export default QuestionDisplay;
