import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Alert, Tooltip, Radio } from 'antd';
import { UserOutlined, BookOutlined, FileTextOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import { KnowledgeTreeGraph } from '../components/D3Visualizations';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalQuestions: 0,
    totalSubmissions: 0,
    averageMastery: 0
  });
  
  // 知识点掌握度数据
  const [knowledgeMastery, setKnowledgeMastery] = useState([]);
  
  // 知识点树图数据
  const [knowledgeTreeData, setKnowledgeTreeData] = useState(null);
  
  // 学习行为数据
  const [behaviorData, setBehaviorData] = useState({
    hourDistribution: [],
    stateDistribution: [],
    weekDistribution: []
  });
  
  // 时间分布图表显示模式
  const [timeDistributionMode, setTimeDistributionMode] = useState('hour');
  
  useEffect(() => {
    // 加载仪表盘数据
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // 获取学生数据
        const studentsResponse = await axios.get('/api/students');
        
        // 获取题目数据
        const questionsResponse = await axios.get('/api/questions');
        
        // 获取所有班级的提交记录数据
        const submissionsResponse = await axios.get('/api/all_submissions');
        
        // 计算平均掌握程度
        const submissions = submissionsResponse.data;
        let averageMastery = 0;
        if (submissions.length > 0) {
          const masteryValues = submissions
            .filter(s => s.Mastery !== undefined && s.Mastery !== null)
            .map(s => parseFloat(s.Mastery));
          if (masteryValues.length > 0) {
            averageMastery = masteryValues.reduce((sum, val) => sum + val, 0) / masteryValues.length;
          }
        }
        
        // 更新统计数据
        setStats({
          totalStudents: studentsResponse.data.length,
          totalQuestions: questionsResponse.data.length,
          totalSubmissions: submissions.length,
          averageMastery: averageMastery
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
          
          // 设置知识点树图数据
          setKnowledgeTreeData(knowledgeData);
        }
        
        // 获取学习行为分析数据
        const behaviorResponse = await axios.get('/api/analysis/behavior');
        if (behaviorResponse.data.status === 'success') {
          const behaviorProfile = behaviorResponse.data.behavior_profile;
          
          // 使用完整的24小时分布数据
          const hourData = behaviorProfile.hour_distribution || [];
          
          // 处理状态分布数据
          const stateData = Object.entries(behaviorProfile.state_distribution).filter(([key, value]) => !key.match(/[^\x00-\x7F]/)).map(([key, value]) => ({
            name: key,
            value: value
          }));
          
          // 处理一周分布数据（从小时数据计算）
          const weekData = calculateWeekDistribution(submissions);
          
          setBehaviorData({
            hourDistribution: hourData,
            stateDistribution: stateData,
            weekDistribution: weekData
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
  
  // 计算一周分布数据
  const calculateWeekDistribution = (submissions) => {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekCounts = Array(7).fill(0);
    
    submissions.forEach(submission => {
      // 后端返回的时间字段是time，格式为Unix时间戳
      if (submission.time) {
        // 将Unix时间戳转换为毫秒，然后创建Date对象
        // 由于时间戳是UTC时间，需要转换为北京时间（UTC+8）
        const timestamp = parseFloat(submission.time) * 1000; // 转换为毫秒
        const utcDate = new Date(timestamp);
        
        // 转换为北京时间（UTC+8）
        const beijingOffset = 8 * 60 * 60 * 1000; // 8小时的毫秒数
        const beijingDate = new Date(utcDate.getTime() + beijingOffset);
        
        const dayOfWeek = beijingDate.getDay(); // 0 = 周日, 1 = 周一, ..., 6 = 周六
        weekCounts[dayOfWeek]++;
      }
    });
    
    return weekDays.map((day, index) => ({
      day: day,
      count: weekCounts[index]
    }));
  };
  
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
  
  // 学习行为图表配置 - 一周分布
  const getWeekChartOption = () => {
    const days = behaviorData.weekDistribution.map(item => item.day);
    const counts = behaviorData.weekDistribution.map(item => item.count);
    
    // 根据星期设置颜色
    const getBarColor = (dayIndex) => {
      if (dayIndex === 0 || dayIndex === 6) return '#fa8c16'; // 周末 - 橙色
      return '#1890ff'; // 工作日 - 蓝色
    };
    
    const barColors = days.map((_, index) => getBarColor(index));
    
    return {
      title: {
        text: '答题时间分布（一周）',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          const day = params[0].name;
          const count = params[0].value;
          const isWeekend = day === '周日' || day === '周六';
          const dayType = isWeekend ? '周末' : '工作日';
          return `${day}<br/>提交次数: ${count}<br/>类型: ${dayType}`;
        }
      },
      legend: {
        data: ['工作日', '周末'],
        bottom: 0,
        icon: 'rect',
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { fontSize: 12 }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: days,
        name: '星期',
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'value',
        name: '提交次数',
        nameLocation: 'middle',
        nameGap: 40
      },
      series: [
        {
          name: '提交次数',
          type: 'bar',
          data: counts,
          itemStyle: {
            color: function(params) {
              return barColors[params.dataIndex];
            }
          }
        }
      ]
    };
  };
  
  // 学习行为图表配置 - 小时分布
  const getHourChartOption = () => {
    // 确保使用完整的24小时数据
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const counts = Array.from({length: 24}, (_, i) => {
      const hourData = behaviorData.hourDistribution.find(item => item.hour === i);
      return hourData ? hourData.count : 0;
    });
    
    // 根据时间段设置颜色
    const getBarColor = (hour) => {
      if (hour >= 6 && hour < 12) return '#52c41a'; // 上午 - 绿色
      if (hour >= 12 && hour < 18) return '#1890ff'; // 下午 - 蓝色
      if (hour >= 18 && hour < 22) return '#fa8c16'; // 晚上 - 橙色
      return '#722ed1'; // 深夜/凌晨 - 紫色
    };
    
    const barColors = hours.map((_, index) => getBarColor(index));
    
    return {
      title: {
        text: '答题时间分布（24小时，北京时间）',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          const hour = params[0].name.split(':')[0];
          const count = params[0].value;
          let period = '';
          if (hour >= 6 && hour < 12) period = '上午';
          else if (hour >= 12 && hour < 18) period = '下午';
          else if (hour >= 18 && hour < 22) period = '晚上';
          else period = '深夜/凌晨';
          return `${params[0].name}<br/>提交次数: ${count}<br/>时段: ${period}`;
        }
      },
      legend: {
        data: ['上午(6-12点)', '下午(12-18点)', '晚上(18-22点)', '深夜/凌晨(22-6点)'],
        bottom: 0,
        icon: 'rect',
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { fontSize: 12 }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: hours,
        name: '时间（北京时间）',
        nameLocation: 'middle',
        nameGap: 30,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
          interval: 0  // 强制显示所有标签
        }
      },
      yAxis: {
        type: 'value',
        name: '提交次数',
        nameLocation: 'middle',
        nameGap: 40
      },
      series: [
        {
          name: '提交次数',
          type: 'bar',
          data: counts,
          itemStyle: {
            color: function(params) {
              return barColors[params.dataIndex];
            }
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
              title={
                <span>
                  平均掌握程度
                  <Tooltip title={
                    <div>
                      <div><strong>掌握程度计算方式：</strong></div>
                      <div>• Absolutely_Correct: 1.0</div>
                      <div>• Partially_Correct: 分数占比</div>
                      <div>• Error1-Error9: 0.1 + 0.2 × 分数占比</div>
                      <div>• Absolutely_Error: 0.0</div>
                    </div>
                  }>
                    <InfoCircleOutlined style={{ marginLeft: 4, color: '#1890ff' }} />
                  </Tooltip>
                </span>
              }
              value={stats.averageMastery}
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
          <Card className="chart-card" title="知识点掌握度树图">
            {knowledgeTreeData && (
              <KnowledgeTreeGraph 
                data={knowledgeTreeData} 
                width={500} 
                height={350} 
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card 
            className="chart-card" 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>答题时间分布</span>
                <Radio.Group 
                  value={timeDistributionMode} 
                  onChange={(e) => setTimeDistributionMode(e.target.value)}
                  size="small"
                >
                  <Radio.Button value="hour">24小时</Radio.Button>
                  <Radio.Button value="week">一周</Radio.Button>
                </Radio.Group>
              </div>
            }
          >
            <ReactECharts
              option={timeDistributionMode === 'hour' ? getHourChartOption() : getWeekChartOption()}
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