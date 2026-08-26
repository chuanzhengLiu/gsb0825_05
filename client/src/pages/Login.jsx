import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Feather, Loader2 } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('demo@flytie.atlas');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      login(res.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex bg-flytie-primary p-3 rounded-xl mb-3">
            <Feather className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold">登录 FlyTie Atlas</h1>
          <p className="text-sm text-gray-500 mt-1">继续你的绑制之旅</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            登录
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          还没有账号？<Link to="/register" className="text-flytie-primary hover:underline">立即注册</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
