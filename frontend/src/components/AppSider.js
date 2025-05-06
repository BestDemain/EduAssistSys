import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  BookOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  MessageOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

const AppSider = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  
  // 获取当前路径，用于设置菜单选中状态
  const selectedKey = location.pathname === '/' ? '1' : 
                     location.pathname === '/knowledge' ? '2' : 
                     location.pathname === '/behavior' ? '3' : 
                     location.pathname === '/difficulty' ? '4' : 
                     location.pathname === '/report' ? '5' : 
                     location.pathname === '/nlp' ? '6' : '1';
  
  return (
    <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
      <div className="logo">
        {!collapsed ? '教育辅助系统' : 'EAS'}
      </div>
      <Menu theme="dark" selectedKeys={[selectedKey]} mode="inline">
        <Menu.Item key="1" icon={<DashboardOutlined />}>
          <Link to="/">总览</Link>
        </Menu.Item>
        <Menu.Item key="2" icon={<BookOutlined />}>
          <Link to="/knowledge">知识点分析</Link>
        </Menu.Item>
        <Menu.Item key="3" icon={<UserOutlined />}>
          <Link to="/behavior">学习行为分析</Link>
        </Menu.Item>
        <Menu.Item key="4" icon={<QuestionCircleOutlined />}>
          <Link to="/difficulty">题目难度分析</Link>
        </Menu.Item>
        <Menu.Item key="5" icon={<FileTextOutlined />}>
          <Link to="/report">报告生成</Link>
        </Menu.Item>
        <Menu.Item key="6" icon={<MessageOutlined />}>
          <Link to="/nlp">自然语言交互</Link>
        </Menu.Item>
      </Menu>
    </Sider>
  );
};

export default AppSider;