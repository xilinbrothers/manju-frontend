import React, { useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([
    { id: 1, name: 'Super Admin', email: 'admin@example.com', role: '所有者', addedAt: '2026-03-01' },
    { id: 2, name: 'Developer', email: 'dev@company.com', role: '管理员', addedAt: '2026-03-10' },
    { id: 3, name: 'xilinbrothers', email: 'xilinbrothers@gmail.com', role: '管理员', addedAt: '2026-03-16' },
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="管理员管理"
        subtitle="配置后台访问白名单（示例数据）"
        right={<Button>添加管理员</Button>}
      />

      <div className="bg-indigo-50 border border-indigo-200 rounded-[var(--app-radius-lg)] p-5">
        <div className="text-sm font-black text-indigo-800">权限说明</div>
        <div className="mt-1 text-sm text-indigo-700 font-medium leading-relaxed">
          白名单内账号拥有后台全部权限。管理员需使用 Google 账号登录（后续将接入后端校验）。
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="text-base font-black text-slate-900">管理员列表</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="搜索姓名 / 邮箱"
              className="w-[320px] h-10 rounded-xl bg-slate-100 border border-slate-200 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider">
            <tr>
              <th className="px-8 py-5">姓名</th>
              <th className="px-8 py-5">Google 邮箱</th>
              <th className="px-8 py-5">角色</th>
              <th className="px-8 py-5">添加时间</th>
              <th className="px-8 py-5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center">
                    <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-black mr-3 text-xs">
                      {admin.name.charAt(0)}
                    </div>
                    <span className="text-sm font-black text-slate-900">{admin.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-sm text-slate-700 font-medium">
                  {admin.email}
                </td>
                <td className="px-8 py-5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black border ${
                    admin.role === '所有者'
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    {admin.role}
                  </span>
                </td>
                <td className="px-8 py-5 text-xs text-slate-500 font-mono">
                  {admin.addedAt}
                </td>
                <td className="px-8 py-5 text-right">
                  {admin.role !== '所有者' && (
                    <Button variant="danger" size="sm">
                      移除
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-6">
        <PageHeader
          title="新增管理员"
          subtitle="输入 Google 邮箱并添加到白名单"
          right={<Button variant="secondary">批量导入</Button>}
        />

        <div className="mt-5 flex items-center gap-2 max-w-xl">
          <input
            type="email"
            placeholder="example@gmail.com"
            className="flex-1 h-11 rounded-xl bg-slate-100 border border-slate-200 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <select className="h-11 rounded-xl bg-slate-100 border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option>管理员</option>
            <option>所有者</option>
          </select>
          <Button size="lg" className="px-5">添加</Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminManagement;
