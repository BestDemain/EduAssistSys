import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Select, Button, Table, Spin, Alert, Typography, Divider } from 'antd';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import { KnowledgeForceGraph } from '../components/D3Visualizations';

const { Option } = Select;
const { Title, Paragraph } = Typography;

const KnowledgeAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [knowledgeData, setKnowledgeData] = useState(null);
  const [weakPoints, setWeakPoints] = useState([]);
  const [forceGraphData, setForceGraphData] = useState(null);
  
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
  
  // 分析知识点掌握度
  const analyzeKnowledge = async () => {
    try {
      setLoading(true);
      setError(null);
      // 重置力导向图数据，避免使用旧数据
      setForceGraphData(null);
      
      const url = selectedStudent 
        ? `/api/analysis/knowledge?student_id=${selectedStudent}` 
        : '/api/analysis/knowledge';
      
      console.log('请求知识点分析数据:', url);
      const response = await axios.get(url);
      console.log('知识点分析响应:', response.data);
      
      if (response.data.status === 'success') {
        setKnowledgeData(response.data.knowledge_mastery);
        setWeakPoints(response.data.weak_points || []);
        
        // 获取知识点关联数据用于力导向图可视化
        if (response.data.knowledge_relations) {
          console.log('API直接返回了知识点关联数据');
          setForceGraphData(response.data.knowledge_relations);
        } else {
          // 如果API没有返回关联数据，尝试单独获取
          try {
            const relationsUrl = selectedStudent 
              ? `/api/analysis/knowledge_relations?student_id=${selectedStudent}` 
              : '/api/analysis/knowledge_relations';
            
            console.log('尝试单独获取知识点关联数据:', relationsUrl);
            const relationsResponse = await axios.get(relationsUrl);
            console.log('知识点关联响应:', relationsResponse.data);
            
            if (relationsResponse.data.status === 'success' && relationsResponse.data.relations) {
              console.log('成功获取知识点关联数据');
              setForceGraphData(relationsResponse.data.relations);
            } else {
              console.log('API未返回有效的知识点关联数据，将生成模拟数据');
              // 如果API不存在，生成模拟数据用于展示
              setTimeout(() => generateMockForceGraphData(), 0);
            }
          } catch (relationsErr) {
            console.error('获取知识点关联数据失败:', relationsErr);
            // 生成模拟数据用于展示
            console.log('将生成模拟的知识点关联数据');
            setTimeout(() => generateMockForceGraphData(), 0);
          }
        }
      } else {
        setError(response.data.message || '分析失败');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('知识点分析失败:', err);
      setError('知识点分析失败，请稍后重试');
      setLoading(false);
    }
  };
  
  // 生成模拟力导向图数据
  const generateMockForceGraphData = () => {
    if (!knowledgeData) {
      console.log('无法生成力导向图：知识点数据为空');
      return;
    }
    
    const knowledgeNames = Object.keys(knowledgeData);
    console.log('知识点列表:', knowledgeNames);
    
    if (knowledgeNames.length === 0) {
      console.log('无法生成力导向图：知识点列表为空');
      return;
    }
    
    // 创建节点
    const nodes = knowledgeNames.map(name => ({
      id: name,
      name: name,
      mastery: knowledgeData[name].correct_rate || 0,
      value: (knowledgeData[name].total_submissions || 1) / 10 // 节点大小基于提交次数
    }));
    
    // 创建连接
    const links = [];
    
    // 确保至少有两个知识点才能创建连接
    if (knowledgeNames.length > 1) {
      // 为每个知识点创建1-2个随机连接
      knowledgeNames.forEach((source, i) => {
        const numLinks = Math.floor(Math.random() * 2) + 1; // 1-2个连接
        
        for (let j = 0; j < numLinks; j++) {
          // 随机选择目标知识点（不包括自己）
          let targetIndex;
          do {
            targetIndex = Math.floor(Math.random() * knowledgeNames.length);
          } while (targetIndex === i);
          
          const target = knowledgeNames[targetIndex];
          
          // 添加连接（避免重复）
          if (!links.some(link => 
            (link.source === source && link.target === target) || 
            (link.source === target && link.target === source)
          )) {
            links.push({
              source: source,
              target: target,
              value: Math.random() * 2 + 1 // 随机连接强度
            });
          }
        }
      });
    } else if (knowledgeNames.length === 1) {
      // 如果只有一个知识点，创建自环
      links.push({
        source: knowledgeNames[0],
        target: knowledgeNames[0],
        value: 1
      });
      console.log('只有一个知识点，创建自环连接');
    } else {
      console.log('无法创建连接：知识点数量不足');
    }
    
    const graphData = { nodes, links };
    console.log('生成的力导向图数据:', graphData);
    setForceGraphData(graphData);
  };
  
  // 生成知识点掌握度雷达图配置
  const getKnowledgeRadarOption = () => {
    if (!knowledgeData) return {};
    
    const knowledgeNames = Object.keys(knowledgeData);
    const correctRates = knowledgeNames.map(name => (knowledgeData[name].correct_rate * 100).toFixed(2));
    
    return {
      title: {
        text: '知识点掌握度雷达图',
        left: 'center'
      },
      tooltip: {
        trigger: 'item'
      },
      radar: {
        indicator: knowledgeNames.map(name => ({ name, max: 100 }))
      },
      series: [
        {
          name: '知识点掌握度',
          type: 'radar',
          data: [
            {
              value: correctRates,
              name: '正确率(%)',
              areaStyle: {
                color: 'rgba(24, 144, 255, 0.3)'
              },
              lineStyle: {
                color: '#1890ff'
              },
              itemStyle: {
                color: '#1890ff'
              }
            }
          ]
        }
      ]
    };
  };
  
  // 生成知识点掌握度柱状图配置
  const getKnowledgeBarOption = () => {
    if (!knowledgeData) return {};
    
    const knowledgeNames = Object.keys(knowledgeData);
    const correctRates = knowledgeNames.map(name => (knowledgeData[name].correct_rate * 100).toFixed(2));
    const submissionRates = knowledgeNames.map(name => (knowledgeData[name].correct_submission_rate * 100).toFixed(2));
    
    return {
      title: {
        text: '知识点掌握度对比',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['正确率(%)', '正确提交率(%)'],
        top: 'bottom'
      },
      xAxis: {
        type: 'category',
        data: knowledgeNames,
        axisLabel: {
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        name: '百分比(%)',
        max: 100
      },
      series: [
        {
          name: '正确率(%)',
          type: 'bar',
          data: correctRates,
          itemStyle: {
            color: '#1890ff'
          }
        },
        {
          name: '正确提交率(%)',
          type: 'bar',
          data: submissionRates,
          itemStyle: {
            color: '#52c41a'
          }
        }
      ]
    };
  };
  
  // 从属知识点表格列定义
  const subKnowledgeColumns = [
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
      title: '正确提交率',
      dataIndex: 'correct_submission_rate',
      key: 'correct_submission_rate',
      render: (text) => `${(text * 100).toFixed(2)}%`,
      sorter: (a, b) => a.correct_submission_rate - b.correct_submission_rate,
    },
    {
      title: '平均用时(秒)',
      dataIndex: 'avg_time_consume',
      key: 'avg_time_consume',
      render: (text) => text.toFixed(2),
      sorter: (a, b) => a.avg_time_consume - b.avg_time_consume,
    },
    {
      title: '总提交次数',
      dataIndex: 'total_submissions',
      key: 'total_submissions',
      sorter: (a, b) => a.total_submissions - b.total_submissions,
    },
    {
      title: '正确提交次数',
      dataIndex: 'correct_submissions',
      key: 'correct_submissions',
      sorter: (a, b) => a.correct_submissions - b.correct_submissions,
    },
  ];
  
  // 薄弱环节表格列定义
  const weakPointsColumns = [
    {
      title: '知识点',
      dataIndex: 'knowledge',
      key: 'knowledge',
    },
    {
      title: '从属知识点',
      dataIndex: 'sub_knowledge',
      key: 'sub_knowledge',
      render: (text) => text || '-',
    },
    {
      title: '正确率',
      dataIndex: 'correct_rate',
      key: 'correct_rate',
      render: (text) => `${(text * 100).toFixed(2)}%`,
      sorter: (a, b) => a.correct_rate - b.correct_rate,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
    },
  ];
  
  // 准备从属知识点表格数据
  const getSubKnowledgeData = () => {
    if (!knowledgeData) return [];
    
    const tableData = [];
    
    Object.entries(knowledgeData).forEach(([knowledge, data]) => {
      if (data.sub_knowledge) {
        Object.entries(data.sub_knowledge).forEach(([sub_knowledge, sub_data]) => {
          tableData.push({
            key: `${knowledge}-${sub_knowledge}`,
            knowledge,
            sub_knowledge,
            ...sub_data
          });
        });
      }
    });
    
    return tableData;
  };
  
  return (
    <div>
      <Title level={2}>知识点掌握度分析</Title>
      <Paragraph>
        本模块分析学习者答题行为日志记录，从答题分数、答题状态等多维度属性量化评估知识点掌握程度，并识别其知识体系中存在的薄弱环节。
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
            <Button type="primary" onClick={analyzeKnowledge} loading={loading}>
              分析
            </Button>
          </Col>
        </Row>
      </Card>
      
      {error && <Alert message="错误" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      
      {loading ? (
        <Spin tip="分析中..." size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }} />
      ) : knowledgeData ? (
        <>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Card className="chart-card" title="知识点掌握度雷达图">
                <ReactECharts
                  option={getKnowledgeRadarOption()}
                  style={{ height: '300px', width: '100%' }}
                  className="chart-container"
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="chart-card" title="知识点掌握度对比">
                <ReactECharts
                  option={getKnowledgeBarOption()}
                  style={{ height: '300px', width: '100%' }}
                  className="chart-container"
                />
              </Card>
            </Col>
          </Row>
          
          {/* D3.js知识点关联力导向图 */}
          {forceGraphData && forceGraphData.nodes && (
            <Row gutter={16}>
              <Col xs={24}>
                <Card className="chart-card" title="知识点关联力导向图 (D3可视化)">
                  <KnowledgeForceGraph data={forceGraphData} />
                </Card>
              </Col>
            </Row>
          )}
          
          {/* 调试信息 */}
          {forceGraphData && console.log('力导向图数据:', forceGraphData)}
          
          <Divider orientation="left">从属知识点掌握情况</Divider>
          <Table 
            columns={subKnowledgeColumns} 
            dataSource={getSubKnowledgeData()} 
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 5 }}
            className="data-table"
          />
          
          {weakPoints.length > 0 && (
            <>
              <Divider orientation="left">薄弱环节分析</Divider>
              <Alert
                message="发现知识薄弱环节"
                description="以下知识点或从属知识点的掌握程度较低，建议加强学习。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Table 
                columns={weakPointsColumns} 
                dataSource={weakPoints.map((item, index) => ({ ...item, key: index }))} 
                pagination={{ pageSize: 5 }}
                className="data-table"
              />
            </>
          )}
        </>
      ) : null}
    </div>
  );
};

export default KnowledgeAnalysis;