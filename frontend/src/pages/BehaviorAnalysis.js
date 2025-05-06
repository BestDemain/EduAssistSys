import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Select, Button, Table, Spin, Alert, Typography, Divider, Tag } from 'antd';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import { Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Title, Paragraph } = Typography;

const BehaviorAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [behaviorData, setBehaviorData] = useState(null);
  
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
    if (!behaviorData || !behaviorData.peak_hours) return {};
    
    const hours = behaviorData.peak_hours.map(item => item.hour);
    const counts = behaviorData.peak_hours.map(item => item.count);
    
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
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: stateData.map(item => item.name)
      },
      series: [
        {
          name: '答题状态',
          type: 'pie',
          radius: '60%',
          center: ['50%', '50%'],
          data: stateData,
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
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: methodData.map(item => item.name)
      },
      series: [
        {
          name: '解题方法',
          type: 'pie',
          radius: '60%',
          center: ['50%', '50%'],
          data: methodData,
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
  
  // 生成周内答题分布图表配置
  const getWeekdayDistributionOption = () => {
    if (!behaviorData) return {};
    
    // 模拟周内分布数据（实际应从API获取）
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const weekdayData = weekdays.map((day, index) => ({
      name: day,
      value: Math.floor(Math.random() * 100) + 20 // 模拟数据
    }));
    
    return {
      title: {
        text: '周内答题分布',
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
        data: weekdays
      },
      yAxis: {
        type: 'value',
        name: '提交次数'
      },
      series: [
        {
          name: '提交次数',
          type: 'bar',
          data: weekdayData.map(item => item.value),
          itemStyle: {
            color: '#52c41a'
          }
        }
      ]
    };
  };
  
  // 获取学习行为特征标签
  const getBehaviorTags = () => {
    if (!behaviorData) return [];
    
    const tags = [];
    
    // 根据正确率添加标签
    if (behaviorData.correct_rate > 0.8) {
      tags.push({ color: 'green', text: '高正确率' });
    } else if (behaviorData.correct_rate < 0.5) {
      tags.push({ color: 'red', text: '低正确率' });
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
        tags.push({ color: 'green', text: '正确率高于平均' });
      } else if (behaviorData.relative_performance.correct_rate_vs_avg < -0.1) {
        tags.push({ color: 'red', text: '正确率低于平均' });
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
                  title="正确率" 
                  value={behaviorData.correct_rate} 
                  precision={2} 
                  formatter={(value) => `${(value * 100).toFixed(2)}%`} 
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col xs={24} md={12}>
                <Statistic title="平均答题时间" value={behaviorData.avg_time_consume.toFixed(2)} suffix="秒" />
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
                      title="正确率对比" 
                      value={behaviorData.relative_performance.correct_rate_vs_avg} 
                      precision={2} 
                      formatter={(value) => `${(value * 100).toFixed(2)}%`} 
                      valueStyle={{ color: behaviorData.relative_performance.correct_rate_vs_avg >= 0 ? '#3f8600' : '#cf1322' }}
                      prefix={behaviorData.relative_performance.correct_rate_vs_avg >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Statistic 
                      title="答题时间对比" 
                      value={behaviorData.relative_performance.time_consume_vs_avg.toFixed(2)} 
                      suffix="秒" 
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
              <Card className="chart-card" title="答题时间分布">
                <ReactECharts
                  option={getHourDistributionOption()}
                  style={{ height: '100%', width: '100%' }}
                  className="chart-container"
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="chart-card" title="答题状态分布">
                <ReactECharts
                  option={getStateDistributionOption()}
                  style={{ height: '100%', width: '100%' }}
                  className="chart-container"
                />
              </Card>
            </Col>
          </Row>
          
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col xs={24} md={12}>
              <Card className="chart-card" title="解题方法分布">
                <ReactECharts
                  option={getMethodDistributionOption()}
                  style={{ height: '100%', width: '100%' }}
                  className="chart-container"
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="chart-card" title="周内答题分布">
                <ReactECharts
                  option={getWeekdayDistributionOption()}
                  style={{ height: '100%', width: '100%' }}
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