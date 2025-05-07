import React from 'react';
import { Layout, ConfigProvider } from 'antd';
import { Routes, Route } from 'react-router-dom';
import zhCN from 'antd/lib/locale/zh_CN';

// 导入组件
import AppHeader from './components/AppHeader';
import AppSider from './components/AppSider';
import Dashboard from './pages/Dashboard';
import KnowledgeAnalysis from './pages/KnowledgeAnalysis';
import BehaviorAnalysis from './pages/BehaviorAnalysis';
import DifficultyAnalysis from './pages/DifficultyAnalysis';
import ReportGenerator from './pages/ReportGenerator';
import NLPInteraction from './pages/NLPInteraction';

// 导入样式
import './App.css';

const { Content, Footer } = Layout;

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Layout style={{ minHeight: '100vh' }}>
        <AppHeader />
        <Layout>
          <AppSider />
          <Layout style={{ padding: '0 24px 24px' }}>
            <Content
              className="site-layout-background"
              style={{
                padding: 24,
                margin: '16px 0',
                minHeight: 280,
              }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/knowledge" element={<KnowledgeAnalysis />} />
                <Route path="/behavior" element={<BehaviorAnalysis />} />
                <Route path="/difficulty" element={<DifficultyAnalysis />} />
                <Route path="/report" element={<ReportGenerator />} />
                <Route path="/nlp" element={<NLPInteraction />} />
              </Routes>
            </Content>
            <Footer style={{ textAlign: 'center' }}>
              教育辅助可视分析系统 ©{new Date().getFullYear()} 可视化项目小组
            </Footer>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;