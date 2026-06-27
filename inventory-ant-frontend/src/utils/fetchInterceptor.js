const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const originalFetch = window.fetch;

window.fetch = async function (url, options) {
  // Normalize options
  options = options || {};
  options.headers = options.headers || {};

  // Check if this is an API request to our backend
  const isApiRequest = typeof url === 'string' && url.includes('/api/');
  const isAuthRequest = typeof url === 'string' && (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/signup') ||
    url.includes('/api/auth/refresh') ||
    url.includes('/api/admin/login')
  );

  // If the request already has an old token and a new one is in localStorage, use the new one!
  if (isApiRequest && !isAuthRequest) {
    const activeToken = localStorage.getItem('ant_token');
    if (activeToken) {
      // Get the Authorization header from options.headers
      let reqToken = null;
      if (options.headers instanceof Headers) {
        const auth = options.headers.get('Authorization');
        if (auth && auth.startsWith('Bearer ')) {
          reqToken = auth.substring(7);
        }
      } else if (Array.isArray(options.headers)) {
        const auth = options.headers.find(([k]) => k.toLowerCase() === 'authorization');
        if (auth && auth[1] && auth[1].startsWith('Bearer ')) {
          reqToken = auth[1].substring(7);
        }
      } else {
        const auth = options.headers['Authorization'];
        if (auth && auth.startsWith('Bearer ')) {
          reqToken = auth.substring(7);
        }
      }

      // If we are sending an old token, replace it with the fresh one in localStorage!
      if (reqToken && reqToken !== activeToken) {
        if (options.headers instanceof Headers) {
          options.headers.set('Authorization', `Bearer ${activeToken}`);
        } else if (Array.isArray(options.headers)) {
          const authIdx = options.headers.findIndex(([k]) => k.toLowerCase() === 'authorization');
          if (authIdx !== -1) {
            options.headers[authIdx][1] = `Bearer ${activeToken}`;
          }
        } else {
          options.headers['Authorization'] = `Bearer ${activeToken}`;
        }
      }
    }
  }

  let response = await originalFetch(url, options);

  if (response.status === 401 && isApiRequest && !isAuthRequest && !options._retry) {
    options._retry = true;
    const refreshToken = localStorage.getItem('ant_refresh_token');
    
    if (refreshToken) {
      try {
        const refreshResponse = await originalFetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
          _retry: true // do not intercept the refresh call
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          if (data.access_token && data.refresh_token) {
            localStorage.setItem('ant_token', data.access_token);
            localStorage.setItem('ant_refresh_token', data.refresh_token);

            // Notify App component to update state
            window.dispatchEvent(new CustomEvent('token-refreshed', { 
              detail: { token: data.access_token } 
            }));

            // Update header and retry
            if (options.headers instanceof Headers) {
              options.headers.set('Authorization', `Bearer ${data.access_token}`);
            } else if (Array.isArray(options.headers)) {
              const authIdx = options.headers.findIndex(([k]) => k.toLowerCase() === 'authorization');
              if (authIdx !== -1) {
                options.headers[authIdx][1] = `Bearer ${data.access_token}`;
              }
            } else {
              options.headers['Authorization'] = `Bearer ${data.access_token}`;
            }

            return await originalFetch(url, options);
          }
        }
      } catch (err) {
        console.error("Auto token refresh failed:", err);
      }
    }

    // If refresh token request failed or there was no refresh token, perform logout/cleanup
    localStorage.removeItem('ant_token');
    localStorage.removeItem('ant_refresh_token');
    localStorage.removeItem('ant_user');
    localStorage.removeItem('ant_role');
    
    window.dispatchEvent(new CustomEvent('token-expired'));
    
    // Redirect to login only if not already on public screens
    const path = window.location.pathname;
    if (path !== '/' && path !== '/login' && path !== '/signup') {
      window.location.href = '/login';
    }
  }

  return response;
};
