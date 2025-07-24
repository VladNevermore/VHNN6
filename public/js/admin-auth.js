document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const login = e.target[0].value;
  const password = e.target[1].value;
  
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('adminToken', data.token);
      window.location.href = '/admin';
    } else {
      alert(data.message || 'Ошибка входа');
    }
  } catch (error) {
    console.error('Login error:', error);
  }
});