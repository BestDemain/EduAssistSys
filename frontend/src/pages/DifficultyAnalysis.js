import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Spin, Alert, Typography, Divider, Tag, Radio } from 'antd';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import { DifficultyScatterPlot, CombinedKnowledgeScatterPlot } from '../components/D3Visualizations';

const { Title, Paragraph } = Typography;

const DifficultyAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [difficultyData, setDifficultyData] = useState(null);
  const [unreasonableQuestions, setUnreasonableQuestions] = useState([]);
  const [knowledgeScatterData, setKnowledgeScatterData] = useState([]);
  const [subKnowledgeScatterData, setSubKnowledgeScatterData] = useState([]);
  const [scatterPlotMode, setScatterPlotMode] = useState('difficulty'); // 'difficulty' 或 'knowledge'
  
  // 分析题目难度
  const analyzeDifficulty = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 并行获取所有数据
      const [difficultyResponse, knowledgeResponse, subKnowledgeResponse] = await Promise.all([
        axios.get('/api/analysis/difficulty'),
        axios.get('/api/analysis/knowledge-scatter'),
        axios.get('/api/analysis/sub-knowledge-scatter')
      ]);
      
      if (difficultyResponse.data.status === 'success') {
        setDifficultyData(difficultyResponse.data.question_difficulty);
        setUnreasonableQuestions(difficultyResponse.data.unreasonable_questions || []);
      } else {
        setError(difficultyResponse.data.message || '分析失败');
      }
      
      if (knowledgeResponse.data.status === 'success') {
        setKnowledgeScatterData(knowledgeResponse.data.knowledge_scatter_data || []);
      }
      
      if (subKnowledgeResponse.data.status === 'success') {
        setSubKnowledgeScatterData(subKnowledgeResponse.data.sub_knowledge_scatter_data || []);
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
      (item.avg_mastery || 0) * 100, // 平均掌握程度
      item.correct_rate * 100,       // 正确率
      item.title_id,                 // 题目ID
      item.knowledge                 // 知识点
    ]));
    
    return {
      title: {
        text: '题目掌握程度与正确率关系',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          return `题目ID: ${params.value[2]}<br/>` +
                 `知识点: ${params.value[3]}<br/>` +
                 `平均掌握程度: ${params.value[0].toFixed(2)}%<br/>` +
                 `正确率: ${params.value[1].toFixed(2)}%`;
        }
      },
      xAxis: {
        type: 'value',
        name: '平均掌握程度(%)',
        min: 0,
        max: 100
      },
      yAxis: {
        type: 'value',
        name: '正确率(%)',
        min: 0,
        max: 100
      },
      series: [
        {
          name: '题目难度',
          type: 'scatter',
          symbolSize: 10,
          data: data,
          itemStyle: {
            color: function(params) {
              // 根据掌握程度与正确率的差异设置颜色
              const mastery = params.value[0];
              const correctRate = params.value[1];
              const diff = mastery - correctRate;
              
              if (diff > 20) return '#ff4d4f'; // 红色：掌握程度高但正确率低，题目可能过难
              if (diff > 10) return '#faad14'; // 黄色：掌握程度略高于正确率
              if (diff < -20) return '#722ed1'; // 紫色：正确率高但掌握程度低，题目可能过简单
              return '#52c41a'; // 绿色：掌握程度与正确率匹配良好
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
        data: ['平均正确率(%)', '平均用时(毫秒)'],
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
          name: '平均用时(毫秒)',
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
          name: '平均用时(毫秒)',
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
      title: '平均用时(毫秒)',
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
        
        if (record.correct_rate < 0.2) {
          color = 'red';
          text = '困难';
        } else if (record.correct_rate < 0.3) {
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
          {/* 掌握程度与正确率关系图 */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card 
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>掌握程度与正确率关系图</span>
                    <Radio.Group 
                      value={scatterPlotMode} 
                      onChange={(e) => setScatterPlotMode(e.target.value)}
                      size="small"
                    >
                      <Radio.Button value="difficulty">题目难度</Radio.Button>
                      <Radio.Button value="knowledge">知识点</Radio.Button>
                    </Radio.Group>
                  </div>
                }
              >
                {scatterPlotMode === 'difficulty' ? (
                  <DifficultyScatterPlot 
                    data={Object.values(difficultyData).map(item => ({
                      title_id: item.title_id,
                      knowledge: item.knowledge,
                      correct_rate: item.correct_rate,
                      avg_mastery: item.avg_mastery || 0,
                      submit_count: item.total_submissions || 25 // 使用总提交次数
                    }))} 
                    title="题目掌握程度与正确率关系图"
                  />
                ) : (
                  <CombinedKnowledgeScatterPlot 
                    knowledgeData={knowledgeScatterData}
                    subKnowledgeData={subKnowledgeScatterData}
                    title="知识点掌握程度与正确率关系图"
                  />
                )}
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