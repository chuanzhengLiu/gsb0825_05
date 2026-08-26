import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Trash2, Save } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

function Materials() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [form, setForm] = useState({ material_type_id: '', quantity: '', low_stock_threshold: '', notes: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchMaterialTypes();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, alertRes] = await Promise.all([
        apiClient.get('/inventory'),
        apiClient.get('/inventory/alerts')
      ]);
      setInventory(invRes.data);
      setAlerts(alertRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialTypes = async () => {
    try {
      const res = await apiClient.get('/materials');
      setMaterialTypes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/inventory', {
        material_type_id: Number(form.material_type_id),
        quantity: Number(form.quantity),
        low_stock_threshold: Number(form.low_stock_threshold) || 0,
        notes: form.notes
      });
      setForm({ material_type_id: '', quantity: '', low_stock_threshold: '', notes: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || '保存失败');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条库存记录？')) return;
    try {
      await apiClient.delete(`/inventory/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || '删除失败');
    }
  };

  if (!user) {
    return <div className="text-center py-20 text-gray-500">请先登录以管理材料库存</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">材料库存</h1>
        <p className="text-gray-500">记录羽毛、丝线、钩子等材料的库存，低库存时会收到预警</p>
      </div>

      {alerts.length > 0 && (
        <div className="card p-4 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center gap-2 font-semibold text-red-700 mb-2">
            <AlertTriangle size={18} /> 低库存预警
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {alerts.map((a) => (
              <li key={a.id}>
                {a.material_name} 仅剩 {Number(a.quantity)} {a.unit}（预警值：{Number(a.low_stock_threshold)}）
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold text-lg mb-4">添加/更新库存</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">材料</label>
            <select
              value={form.material_type_id}
              onChange={(e) => setForm({ ...form, material_type_id: e.target.value })}
              className="input"
              required
            >
              <option value="">选择材料类型</option>
              {materialTypes.map((mt) => <option key={mt.id} value={mt.id}>{mt.name}（{mt.category} / {mt.unit}）</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">数量</label>
            <input
              type="number"
              step="0.01"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">预警阈值</label>
            <input
              type="number"
              step="0.01"
              value={form.low_stock_threshold}
              onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
              className="input"
              placeholder="0"
            />
          </div>
          <button type="submit" className="btn-primary flex items-center justify-center gap-1">
            <Plus size={18} /> 保存
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : inventory.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无库存记录</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3">材料</th>
                <th className="text-left px-4 py-3">分类</th>
                <th className="text-left px-4 py-3">数量</th>
                <th className="text-left px-4 py-3">预警阈值</th>
                <th className="text-left px-4 py-3">状态</th>
                <th className="text-right px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium">{item.material_name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.category}</td>
                  <td className="px-4 py-3">{Number(item.quantity)} {item.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{Number(item.low_stock_threshold)}</td>
                  <td className="px-4 py-3">
                    {Number(item.quantity) <= Number(item.low_stock_threshold) ? (
                      <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded">
                        <AlertTriangle size={12} /> 库存不足
                      </span>
                    ) : (
                      <span className="text-green-600 bg-green-50 px-2 py-1 rounded">充足</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Materials;
