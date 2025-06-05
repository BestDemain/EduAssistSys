import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Select, Button, Table, Spin, Alert, Typography, Divider, Tag, Radio } from 'antd';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import { Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { SubmissionTimeline } from '../components/D3Visualizations';

const { Option } = Select;
const { Title, Paragraph } = Typography;

const BehaviorAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [behaviorData, setBehaviorData] = useState(null);
  const [submissionData, setSubmissionData] = useState([]);
  
  // 时间分布图表显示模式
  const [timeDistributionMode, setTimeDistributionMode] = useState('hour');
  
  // 状态/方法分布图表显示模式
  const [stateMethodMode, setStateMethodMode] = useState('state');
  
  // 加载学生数据
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/students');
        setStudents(response.data);
        setLoading(false);
      } catch (err) {
        console.error('加载学生数据失败:', err);
        setError('加载学生数据失败，请稍后重试');
        setLoading(false);
      }
    };
    
    fetchStudents();
  }, []);
  
  // 分析学习行为
  const analyzeBehavior = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = selectedStudent 
        ? `/api/analysis/behavior?student_id=${selectedStudent}` 
        : '/api/analysis/behavior';
      
      const response = await axios.get(url);
      
      if (response.data.status === 'success') {
        setBehaviorData(response.data.behavior_profile);
        
        // 获取提交数据用于时间线可视化
        if (response.data.submission_timeline) {
          setSubmissionData(response.data.submission_timeline);
        } else {
          // 如果API没有返回时间线数据，尝试单独获取
          try {
            const timelineUrl = selectedStudent 
              ? `/api/analysis/submission_timeline?student_id=${selectedStudent}` 
              : '/api/analysis/submission_timeline';
            
            const timelineResponse = await axios.get(timelineUrl);
            
            if (timelineResponse.data.status === 'success' && timelineResponse.data.submissions) {
              setSubmissionData(timelineResponse.data.submissions);
            }
          } catch (timelineErr) {
            console.error('获取提交时间线数据失败:', timelineErr);
            // 不显示错误，因为这只是附加功能
          }
        }
      } else {
        setError(response.data.message || '分析失败');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('学习行为分析失败:', err);
      setError('学习行为分析失败，请稍后重试');
      setLoading(false);
    }
  };
  
  // 生成答题时间分布图表配置
  const getHourDistributionOption = () => {
    if (!behaviorData || !behaviorData.hour_distribution) return {};
    
    // 确保使用完整的24小时数据
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const counts = Array.from({length: 24}, (_, i) => {
      const hourData = behaviorData.hour_distribution.find(item => item.hour === i);
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
  
  // 生成答题状态分布图表配置
  const getStateDistributionOption = () => {
    if (!behaviorData || !behaviorData.state_distribution) return {};
    
    const stateData = Object.entries(behaviorData.state_distribution).map(([key, value]) => ({
      name: key,
      value: value
    }));
    
    return {
      title: {
        text: '答题状态分布',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 14
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        bottom: 10,
        left: 'center',
        data: stateData.map(item => item.name)
      },
      series: [
        {
          name: '答题状态',
          type: 'pie',
          radius: ['30%', '55%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4
          },
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: stateData
        }
      ]
    };
  };
  
  // 生成方法使用分布图表配置
  const getMethodDistributionOption = () => {
    if (!behaviorData || !behaviorData.method_distribution) return {};
    
    const methodData = Object.entries(behaviorData.method_distribution).map(([key, value]) => ({
      name: key,
      value: value
    }));
    
    return {
      title: {
        text: '解题方法分布',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 14
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        bottom: 10,
        left: 'center',
        data: methodData.map(item => item.name)
      },
      series: [
        {
          name: '解题方法',
          type: 'pie',
          radius: ['30%', '55%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4
          },
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: methodData
        }
      ]
    };

  };
  
  // 计算一周分布数据
  const calculateWeekDistribution = (submissions) => {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekCounts = Array(7).fill(0);
    
    submissions.forEach(submission => {
      let beijingDate;
      
      // 处理后端返回的真实数据（time字段，Unix时间戳）
      if (submission.time) {
        // 将Unix时间戳转换为毫秒，然后创建Date对象
        // 由于时间戳是UTC时间，需要转换为北京时间（UTC+8）
        const timestamp = parseFloat(submission.time) * 1000; // 转换为毫秒
        const utcDate = new Date(timestamp);
        
        // 转换为北京时间（UTC+8）
        const beijingOffset = 8 * 60 * 60 * 1000; // 8小时的毫秒数
        beijingDate = new Date(utcDate.getTime() + beijingOffset);
      }
      // 处理模拟数据（submit_time字段，字符串格式）
      else if (submission.submit_time) {
        // submit_time格式: "2024-01-15 14:30:00"
        beijingDate = new Date(submission.submit_time);
      }
      
      if (beijingDate && !isNaN(beijingDate.getTime())) {
        const dayOfWeek = beijingDate.getDay(); // 0 = 周日, 1 = 周一, ..., 6 = 周六
        weekCounts[dayOfWeek]++;
      }
    });
    
    return weekDays.map((day, index) => ({
      day: day,
      count: weekCounts[index]
    }));
  };
  
  // 生成一周分布图表配置
  const getWeekChartOption = () => {
    if (!submissionData || submissionData.length === 0) return {};
    
    const weekData = calculateWeekDistribution(submissionData);
    const days = weekData.map(item => item.day);
    const counts = weekData.map(item => item.count);
    
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
  
  // 生成周内答题分布图表配置（保留原有的模拟数据功能）
  const getWeekdayDistributionOption = () => {
    if (!behaviorData) return {};
    
    // 如果提交数据为空，使用固定的模拟数据用于D3可视化展示
    if (submissionData.length === 0) {
      const mockSubmissionData = [
        { submit_id: 'mock-1', submit_time: '2024-01-15 09:30:00', knowledge: '数组', is_correct: true, time_consume: 120 },
        { submit_id: 'mock-2', submit_time: '2024-01-15 14:20:00', knowledge: '链表', is_correct: false, time_consume: 180 },
        { submit_id: 'mock-3', submit_time: '2024-01-16 10:15:00', knowledge: '树', is_correct: true, time_consume: 95 },
        { submit_id: 'mock-4', submit_time: '2024-01-16 16:45:00', knowledge: '图', is_correct: true, time_consume: 200 },
        { submit_id: 'mock-5', submit_time: '2024-01-16 20:30:00', knowledge: '动态规划', is_correct: false, time_consume: 250 },
        { submit_id: 'mock-6', submit_time: '2024-01-17 11:20:00', knowledge: '贪心算法', is_correct: true, time_consume: 85 },
        { submit_id: 'mock-7', submit_time: '2024-01-17 15:10:00', knowledge: '数组', is_correct: true, time_consume: 110 },
        { submit_id: 'mock-8', submit_time: '2024-01-18 08:45:00', knowledge: '链表', is_correct: true, time_consume: 140 },
        { submit_id: 'mock-9', submit_time: '2024-01-18 13:30:00', knowledge: '树', is_correct: false, time_consume: 190 },
        { submit_id: 'mock-10', submit_time: '2024-01-18 19:15:00', knowledge: '图', is_correct: true, time_consume: 160 },
        { submit_id: 'mock-11', submit_time: '2024-01-19 09:00:00', knowledge: '动态规划', is_correct: true, time_consume: 220 },
        { submit_id: 'mock-12', submit_time: '2024-01-19 17:30:00', knowledge: '贪心算法', is_correct: false, time_consume: 175 },
        { submit_id: 'mock-13', submit_time: '2024-01-20 10:45:00', knowledge: '数组', is_correct: true, time_consume: 90 },
        { submit_id: 'mock-14', submit_time: '2024-01-20 14:20:00', knowledge: '链表', is_correct: true, time_consume: 130 },
        { submit_id: 'mock-15', submit_time: '2024-01-20 18:00:00', knowledge: '树', is_correct: true, time_consume: 105 },
        { submit_id: 'mock-16', submit_time: '2024-01-21 11:30:00', knowledge: '图', is_correct: false, time_consume: 240 },
        { submit_id: 'mock-17', submit_time: '2024-01-21 15:45:00', knowledge: '动态规划', is_correct: true, time_consume: 195 },
        { submit_id: 'mock-18', submit_time: '2024-01-22 08:20:00', knowledge: '贪心算法', is_correct: true, time_consume: 115 },
        { submit_id: 'mock-19', submit_time: '2024-01-22 12:10:00', knowledge: '数组', is_correct: true, time_consume: 75 },
        { submit_id: 'mock-20', submit_time: '2024-01-22 16:50:00', knowledge: '链表', is_correct: false, time_consume: 210 }
      ];
      
      setSubmissionData(mockSubmissionData);
    }
    
    // 使用新的一周分布图表配置
    return getWeekChartOption();
  };
  
  // 获取学习行为特征标签
  const getBehaviorTags = () => {
    if (!behaviorData) return [];
    
    const tags = [];
    
    // 根据正确率添加标签
    if (behaviorData.correct_rate > 0.8) {
      tags.push({ color: 'green', text: '高掌握程度' });
    } else if (behaviorData.correct_rate < 0.5) {
      tags.push({ color: 'red', text: '低掌握程度' });
    }
    
    // 根据答题时间添加标签
    const peakHour = behaviorData.peak_hours && behaviorData.peak_hours[0];
    if (peakHour) {
      const hour = peakHour.hour;
      if (hour >= 22 || hour <= 5) {
        tags.push({ color: 'purple', text: '夜间答题' });
      } else if (hour >= 9 && hour <= 17) {
        tags.push({ color: 'blue', text: '工作时间答题' });
      }
    }
    
    // 根据平均用时添加标签
    if (behaviorData.avg_time_consume < 2) {
      tags.push({ color: 'green', text: '答题速度快' });
    } else if (behaviorData.avg_time_consume > 5) {
      tags.push({ color: 'orange', text: '答题速度慢' });
    }
    
    // 如果有相对表现数据，添加相应标签
    if (behaviorData.relative_performance) {
      if (behaviorData.relative_performance.correct_rate_vs_avg > 0.1) {
        tags.push({ color: 'green', text: '掌握程度高于平均' });
      } else if (behaviorData.relative_performance.correct_rate_vs_avg < -0.1) {
        tags.push({ color: 'red', text: '掌握程度低于平均' });
      }
      
      if (behaviorData.relative_performance.time_consume_vs_avg < -0.5) {
        tags.push({ color: 'green', text: '答题速度快于平均' });
      } else if (behaviorData.relative_performance.time_consume_vs_avg > 0.5) {
        tags.push({ color: 'orange', text: '答题速度慢于平均' });
      }
    }
    
    return tags;
  };
  
  return (
    <div>
      <Title level={2}>学习行为分析</Title>
      <Paragraph>
        本模块结合学习者的特征挖掘个性化学习行为模式，从多角度设计并展示学习者画像，如答题高峰时段、偏好题型、正确答题率等。
      </Paragraph>
      
      <Card className="filter-form">
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="选择学生"
              style={{ width: '100%' }}
              allowClear
              onChange={setSelectedStudent}
              loading={loading}
            >
              {students.map(student => (
                <Option key={student.student_ID} value={student.student_ID}>
                  {student.student_ID} {student.sex ? `(${student.sex})` : ''}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} style={{ marginTop: { xs: '10px', sm: '0' } }}>
            <Button type="primary" onClick={analyzeBehavior} loading={loading}>
              分析
            </Button>
          </Col>
        </Row>
      </Card>
      
      {error && <Alert message="错误" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      
      {loading ? (
        <Spin tip="分析中..." size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }} />
      ) : behaviorData ? (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Statistic title="总提交次数" value={behaviorData.total_submissions} />
              </Col>
              <Col xs={24} md={12}>
                <Statistic 
                  title="掌握程度" 
                  value={behaviorData.correct_rate} 
                  precision={2} 
                  formatter={(value) => `${(value * 100).toFixed(2)}%`} 
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col xs={24} md={12}>
                <Statistic title="平均运行时间" value={behaviorData.avg_time_consume.toFixed(2)} suffix="ms" />
              </Col>
              <Col xs={24} md={12}>
                <Statistic title="平均内存使用" value={behaviorData.avg_memory ? behaviorData.avg_memory.toFixed(2) : 'N/A'} />
              </Col>
            </Row>
            
            {/* 学习者特征标签 */}
            <Divider orientation="left">学习者特征</Divider>
            <div>
              {getBehaviorTags().map((tag, index) => (
                <Tag color={tag.color} key={index} style={{ margin: '5px' }}>
                  {tag.text}
                </Tag>
              ))}
            </div>
            
            {/* 相对表现 */}
            {behaviorData.relative_performance && (
              <>
                <Divider orientation="left">相对表现（与平均水平比较）</Divider>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Statistic 
                      title="掌握程度对比" 
                      value={behaviorData.relative_performance.correct_rate_vs_avg} 
                      precision={2} 
                      formatter={(value) => `${(value * 100).toFixed(2)}%`} 
                      valueStyle={{ color: behaviorData.relative_performance.correct_rate_vs_avg >= 0 ? '#3f8600' : '#cf1322' }}
                      prefix={behaviorData.relative_performance.correct_rate_vs_avg >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Statistic 
                      title="运行时间对比" 
                      value={behaviorData.relative_performance.time_consume_vs_avg.toFixed(2)} 
                      suffix="ms" 
                      valueStyle={{ color: behaviorData.relative_performance.time_consume_vs_avg <= 0 ? '#3f8600' : '#cf1322' }}
                      prefix={behaviorData.relative_performance.time_consume_vs_avg <= 0 ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                    />
                  </Col>
                </Row>
              </>
            )}
          </Card>
          
          <Row gutter={16}>
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
                style={{ marginBottom: 16, height: '420px' }}
              >
                <ReactECharts
                  option={timeDistributionMode === 'hour' ? getHourDistributionOption() : getWeekdayDistributionOption()}
                  style={{ height: '350px', width: '100%' }}
                  className="chart-container"
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card 
                className="chart-card" 
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>答题分析</span>
                    <Radio.Group 
                      value={stateMethodMode} 
                      onChange={(e) => setStateMethodMode(e.target.value)}
                      size="small"
                    >
                      <Radio.Button value="state">状态分布</Radio.Button>
                      <Radio.Button value="method">方法分布</Radio.Button>
                    </Radio.Group>
                  </div>
                } 
                style={{ marginBottom: 16, height: '420px' }}
              >
                <ReactECharts
                  option={stateMethodMode === 'state' ? getStateDistributionOption() : getMethodDistributionOption()}
                  style={{ height: '350px', width: '100%' }}
                  className="chart-container"
                />
              </Card>
            </Col>
          </Row>
          

        </>
      ) : null}
    </div>
  );
};

export default BehaviorAnalysis;