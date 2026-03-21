async function test() {
  const baseUrl = 'http://localhost:5000/api/challenge';
  
  try {
    console.log('--- Starting Challenge session ---');
    const startRes = await fetch(`${baseUrl}/start`);
    const startData = await startRes.json();
    console.log('Initial Problem:', startData.problem);
    console.log('Initial State:', startData.state);

    let state = startData.state;

    // Test: 3 correct answers to go to level 2
    console.log('\n--- Answering 3 correct answers (expect level 2) ---');
    for (let i = 0; i < 3; i++) {
      const nextRes = await fetch(`${baseUrl}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, isCorrect: true })
      });
      const nextData = await nextRes.json();
      state = nextData.state;
      console.log(`Step ${i+1}:`, state, nextData.problem.question);
    }

    // Test: 2 wrong answers to go back to level 1
    console.log('\n--- Answering 2 wrong answers (expect level 1) ---');
    for (let i = 0; i < 2; i++) {
      const nextRes = await fetch(`${baseUrl}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, isCorrect: false })
      });
      const nextData = await nextRes.json();
      state = nextData.state;
      console.log(`Step ${i+1}:`, state, nextData.problem.question);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

test();
