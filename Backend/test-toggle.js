const test = async () => {
  try {
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'tester_local_1', password: '123' }) // Need to guess password, let's use the local tester from earlier. Or better, just test the controller logic.
    });
    console.log(loginRes.headers.get('set-cookie'));
  } catch (error) {
    console.error(error.message);
  }
}
test();
