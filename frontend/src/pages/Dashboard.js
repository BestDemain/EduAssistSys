import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Alert } from 'antd';
import { UserOutlined, BookOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalQuestions: 0,
    totalSubmissions: 0,
    correctRate: 0
  });
  
  // 知识点掌握度数据
  const [knowledgeMastery, setKnowledgeMastery] = useState([]);
  
  // 学习行为数据
  const [behaviorData, setBehaviorData] = useState({
    hourDistribution: [],
    stateDistribution: []
  });
  
  useEffect(() => {
    // 加载仪表盘数据
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // 获取学生数据
        const studentsResponse = await axios.get('/api/students');
        
        // 获取题目数据
        const questionsResponse = await axios.get('/api/questions');
        
        // 获取提交记录数据
        const submissionsResponse = await axios.get('/api/submissions');
        
        // 计算正确率
        const submissions = submissionsResponse.data;
        const correctSubmissions = submissions.filter(s => s.state === 'Absolutely_Correct').length;
        const correctRate = submissions.length > 0 ? correctSubmissions / submissions.length : 0;
        
        // 更新统计数据
        setStats({
          totalStudents: studentsResponse.data.length,
          totalQuestions: questionsResponse.data.length,
          totalSubmissions: submissions.length,
          correctRate: correctRate
        });
        
        // 获取知识点掌握度分析数据
        const knowledgeResponse = await axios.get('/api/analysis/knowledge');
        if (knowledgeResponse.data.status === 'success') {
          const knowledgeData = knowledgeResponse.data.knowledge_mastery;
          const knowledgeArray = Object.entries(knowledgeData).map(([key, value]) => ({
            name: key,
            value: (value.correct_rate * 100).toFixed(2)
          }));
          setKnowledgeMastery(knowledgeArray);
        }
        
        // 获取学习行为分析数据
        const behaviorResponse = await axios.get('/api/analysis/behavior');
        if (behaviorResponse.data.status === 'success') {
          const behaviorProfile = behaviorResponse.data.behavior_profile;
          
          // 处理小时分布数据
          const hourData = behaviorProfile.peak_hours.map(item => ({
            hour: item.hour,
            count: item.count
          }));
          
          // 处理状态分布数据
          const stateData = Object.entries(behaviorProfile.state_distribution).filter(([key, value]) => !key.match(/[^\x00-\x7F]/)).map(([key, value]) => ({
            name: key,
            value: value
          }));
          
          setBehaviorData({
            hourDistribution: hourData,
            stateDistribution: stateData
          });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('加载仪表盘数据失败:', err);
        setError('加载数据失败，请稍后重试');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  // 知识点掌握度图表配置
  const getKnowledgeChartOption = () => {
    const names = knowledgeMastery.map(item => item.name);
    const values = knowledgeMastery.map(item => parseFloat(item.value));
    return {
      title: {
        text: '知识点掌握度分布',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: names,
        name: '知识点'
      },
      yAxis: {
        type: 'value',
        name: '掌握度 (%)'
      },
      series: [
        {
          name: '掌握度',
          type: 'bar',
          data: values,
          itemStyle: {
            color: '#1890ff'
          }
        }
      ]
    };
  };
  
  // 学习行为图表配置 - 小时分布
  const getHourChartOption = () => {
    const hours = behaviorData.hourDistribution.map(item => item.hour);
    const counts = behaviorData.hourDistribution.map(item => item.count);
    
    return {
      title: {
        text: '答题时间分布',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: hours,
        name: '小时'
      },
      yAxis: {
        type: 'value',
        name: '提交次数'
      },
      series: [
        {
          name: '提交次数',
          type: 'bar',
          data: counts,
          itemStyle: {
            color: '#1890ff'
          }
        }
      ]
    };
  };
  
  // 学习行为图表配置 - 状态分布
  const getStateChartOption = () => {
    return {
      title: {
        text: '答题状态分布',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      series: [
        {
          name: '答题状态',
          type: 'pie',
          radius: '60%',
          center: ['50%', '50%'],
          data: behaviorData.stateDistribution,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  };
  
  if (loading) {
    return <Spin tip="加载中..." size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }} />;
  }
  
  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }
  
  return (
    <div>
      <h2>系统总览</h2>
      
      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="学生总数"
              value={stats.totalStudents}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="题目总数"
              value={stats.totalQuestions}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="提交总数"
              value={stats.totalSubmissions}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="正确率"
              value={stats.correctRate}
              precision={2}
              formatter={(value) => `${(value * 100).toFixed(2)}%`}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 图表 */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card className="chart-card" title="知识点掌握度分析">
            <ReactECharts
              option={getKnowledgeChartOption()}
              style={{ height: '350px', width: '100%' }}
              className="chart-container"
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="chart-card" title="答题时间分布">
            <ReactECharts
              option={getHourChartOption()}
              style={{ height: '350px', width: '100%' }}
              className="chart-container"
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card className="chart-card" title="答题状态分布">
            <ReactECharts
              option={getStateChartOption()}
              style={{ height: '350px', width: '100%' }}
              className="chart-container"
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="chart-card" title="系统功能导航">
            <div style={{ padding: '20px', height: '100%' }}>
              <h3>系统功能</h3>
              <ul>
                <li><strong>知识点分析</strong>：分析学习者知识点掌握程度，识别薄弱环节</li>
                <li><strong>学习行为分析</strong>：挖掘个性化学习行为模式，展示学习者画像</li>
                <li><strong>题目难度分析</strong>：识别不合理的题目难度，提供优化建议</li>
                <li><strong>报告生成</strong>：生成包含自然语言和图表的分析报告</li>
                <li><strong>自然语言交互</strong>：通过自然语言查询分析结果</li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;