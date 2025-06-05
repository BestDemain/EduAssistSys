import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Spin, Alert, Typography, Divider, Tag } from 'antd';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import { DifficultyScatterPlot } from '../components/D3Visualizations';

const { Title, Paragraph } = Typography;

const DifficultyAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [difficultyData, setDifficultyData] = useState(null);
  const [unreasonableQuestions, setUnreasonableQuestions] = useState([]);
  
  // 分析题目难度
  const analyzeDifficulty = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/analysis/difficulty');
      
      if (response.data.status === 'success') {
        setDifficultyData(response.data.question_difficulty);
        setUnreasonableQuestions(response.data.unreasonable_questions || []);
      } else {
        setError(response.data.message || '分析失败');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('题目难度分析失败:', err);
      setError('题目难度分析失败，请稍后重试');
      setLoading(false);
    }
  };
  
  // 加载初始数据
  useEffect(() => {
    analyzeDifficulty();
  }, []);
  
  // 生成题目难度散点图配置
  const getDifficultyScatterOption = () => {
    if (!difficultyData) return {};
    
    const data = Object.values(difficultyData).map(item => ([
      item.correct_rate * 100, // 正确率
      item.avg_time_consume,   // 平均用时
      item.title_id,           // 题目ID
      item.knowledge           // 知识点
    ]));
    
    return {
      title: {
        text: '题目难度分布',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          return `题目ID: ${params.value[2]}<br/>` +
                 `知识点: ${params.value[3]}<br/>` +
                 `正确率: ${params.value[0].toFixed(2)}%<br/>` +
                 `平均用时: ${params.value[1].toFixed(2)}秒`;
        }
      },
      xAxis: {
        type: 'value',
        name: '正确率(%)',
        min: 0,
        max: 100
      },
      yAxis: {
        type: 'value',
        name: '平均用时(秒)'
      },
      series: [
        {
          name: '题目难度',
          type: 'scatter',
          symbolSize: 10,
          data: data,
          itemStyle: {
            color: function(params) {
              // 根据正确率设置颜色
              const correctRate = params.value[0];
              if (correctRate < 30) return '#ff4d4f'; // 红色：难题
              if (correctRate < 60) return '#faad14'; // 黄色：中等难度
              return '#52c41a'; // 绿色：简单题
            }
          }
        }
      ]
    };
  };
  
  // 生成知识点难度柱状图配置
  const getKnowledgeDifficultyOption = () => {
    if (!difficultyData) return {};
    
    // 按知识点分组计算平均正确率和平均用时
    const knowledgeGroups = {};
    Object.values(difficultyData).forEach(item => {
      if (!knowledgeGroups[item.knowledge]) {
        knowledgeGroups[item.knowledge] = {
          correctRates: [],
          timeConsumes: [],
          count: 0
        };
      }
      
      knowledgeGroups[item.knowledge].correctRates.push(item.correct_rate);
      knowledgeGroups[item.knowledge].timeConsumes.push(item.avg_time_consume);
      knowledgeGroups[item.knowledge].count += 1;
    });
    
    // 计算每个知识点的平均值
    const knowledgeData = Object.entries(knowledgeGroups).map(([knowledge, data]) => {
      const avgCorrectRate = data.correctRates.reduce((sum, rate) => sum + rate, 0) / data.count;
      const avgTimeConsume = data.timeConsumes.reduce((sum, time) => sum + time, 0) / data.count;
      
      return {
        knowledge,
        avgCorrectRate: avgCorrectRate * 100, // 转为百分比
        avgTimeConsume
      };
    });
    
    // 排序
    knowledgeData.sort((a, b) => a.avgCorrectRate - b.avgCorrectRate);
    
    return {
      title: {
        text: '知识点难度分布',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['平均正确率(%)', '平均用时(秒)'],
        top: 'bottom'
      },
      xAxis: {
        type: 'category',
        data: knowledgeData.map(item => item.knowledge),
        axisLabel: {
          rotate: 45,
          interval: 0
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '平均正确率(%)',
          min: 0,
          max: 100
        },
        {
          type: 'value',
          name: '平均用时(秒)',
          min: 0
        }
      ],
      series: [
        {
          name: '平均正确率(%)',
          type: 'bar',
          data: knowledgeData.map(item => item.avgCorrectRate.toFixed(2)),
          itemStyle: {
            color: '#1890ff'
          }
        },
        {
          name: '平均用时(秒)',
          type: 'line',
          yAxisIndex: 1,
          data: knowledgeData.map(item => item.avgTimeConsume.toFixed(2)),
          itemStyle: {
            color: '#ff4d4f'
          }
        }
      ]
    };
  };
  
  // 不合理题目表格列定义
  const unreasonableColumns = [
    {
      title: '题目ID',
      dataIndex: 'title_id',
      key: 'title_id',
      ellipsis: true,
    },
    {
      title: '知识点',
      dataIndex: 'knowledge',
      key: 'knowledge',
    },
    {
      title: '从属知识点',
      dataIndex: 'sub_knowledge',
      key: 'sub_knowledge',
    },
    {
      title: '题目正确率',
      dataIndex: 'correct_rate',
      key: 'correct_rate',
      render: (text) => `${(text * 100).toFixed(2)}%`,
      sorter: (a, b) => a.correct_rate - b.correct_rate,
    },
    {
      title: '学生知识掌握度',
      dataIndex: 'avg_mastery',
      key: 'avg_mastery',
      render: (text) => `${(text * 100).toFixed(2)}%`,
      sorter: (a, b) => a.avg_mastery - b.avg_mastery,
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
  ];
  
  // 题目难度表格列定义
  const difficultyColumns = [
    {
      title: '题目ID',
      dataIndex: 'title_id',
      key: 'title_id',
      ellipsis: true,
    },
    {
      title: '知识点',
      dataIndex: 'knowledge',
      key: 'knowledge',
    },
    {
      title: '从属知识点',
      dataIndex: 'sub_knowledge',
      key: 'sub_knowledge',
    },
    {
      title: '正确率',
      dataIndex: 'correct_rate',
      key: 'correct_rate',
      render: (text) => `${(text * 100).toFixed(2)}%`,
      sorter: (a, b) => a.correct_rate - b.correct_rate,
    },
    {
      title: '平均用时(秒)',
      dataIndex: 'avg_time_consume',
      key: 'avg_time_consume',
      render: (text) => text.toFixed(2),
      sorter: (a, b) => a.avg_time_consume - b.avg_time_consume,
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
    },
    {
      title: '难度等级',
      key: 'difficulty_level',
      render: (_, record) => {
        let color = 'green';
        let text = '简单';
        
        if (record.correct_rate < 0.3) {
          color = 'red';
          text = '困难';
        } else if (record.correct_rate < 0.6) {
          color = 'orange';
          text = '中等';
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];
  
  // 准备题目难度表格数据
  const getDifficultyTableData = () => {
    if (!difficultyData) return [];
    
    return Object.entries(difficultyData).map(([title_id, data]) => ({
      key: title_id,
      ...data
    }));
  };
  
  return (
    <div>
      <Title level={2}>题目难度分析</Title>
      <Paragraph>
        本模块分析题目难度与学习者知识掌握程度的匹配情况，识别不合理的题目难度。当学习者知识掌握水平很高但答题正确率较低时，意味着题目难度超出了其能力范围。
      </Paragraph>
      
      <Card className="filter-form">
        <Row gutter={16} align="middle">
          <Col span={24}>
            <Button type="primary" onClick={analyzeDifficulty} loading={loading}>
              分析题目难度
            </Button>
          </Col>
        </Row>
      </Card>
      
      {error && <Alert message="错误" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      
      {loading ? (
        <Spin tip="分析中..." size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }} />
      ) : difficultyData ? (
        <>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card title="题目难度散点图">
                <ReactECharts option={getDifficultyScatterOption()} style={{ height: 400, width: '100%' }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="知识点难度分布">
                <ReactECharts option={getKnowledgeDifficultyOption()} style={{ height: 400, width: '100%' }} />
              </Card>
            </Col>
          </Row>
          
          {/* D3.js题目难度散点图 */}
          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col span={24}>
              <Card title="题目难度与正确率关系图">
                <DifficultyScatterPlot 
                  data={Object.values(difficultyData).map(item => ({
                    title_id: item.title_id,
                    knowledge: item.knowledge,
                    correct_rate: item.correct_rate,
                    avg_time_consume: item.avg_time_consume,
                    submit_count: item.submit_count || 25 // 如果没有提交次数，使用固定默认值
                  }))} 
                  title="题目难度与正确率关系图"
                />
              </Card>
            </Col>
          </Row>
          
          {unreasonableQuestions.length > 0 && (
            <>
              <Divider orientation="left">不合理题目分析</Divider>
              <Alert
                message={`发现${unreasonableQuestions.length}道不合理难度的题目`}
                description="以下题目的难度与学习者的知识掌握程度不匹配，建议调整题目难度或提供更多学习资源。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Table 
                columns={unreasonableColumns} 
                dataSource={unreasonableQuestions.map((item, index) => ({ ...item, key: index }))} 
                scroll={{ x: 'max-content' }}
                pagination={{ pageSize: 5 }}
                className="data-table"
              />
            </>
          )}
          
          <Divider orientation="left">所有题目难度分析</Divider>
          <Table 
            columns={difficultyColumns} 
            dataSource={getDifficultyTableData()} 
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 10 }}
            className="data-table"
          />
        </>
      ) : null}
    </div>
  );
};

export default DifficultyAnalysis;