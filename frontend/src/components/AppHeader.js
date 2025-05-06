import React from 'react';
import { Layout, Typography, Space } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader = () => {
  return (
    <Header className="header" style={{ display: 'flex', alignItems: 'center' }}>
      <Space>
        <BarChartOutlined style={{ fontSize: '24px', color: 'white' }} />
        <Title level={3} style={{ color: 'white', margin: 0 }}>
          教育辅助可视分析系统
        </Title>
      </Space>
    </Header>
  );
};

export default AppHeader;